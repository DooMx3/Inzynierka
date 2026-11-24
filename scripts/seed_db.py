#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "psycopg[binary]>=3.1",
# ]
# ///
"""
Skrypt zasilający bazę danych PostgreSQL przykładowymi danymi dla aplikacji winnicy (Inżynierka).

Obsługuje automatyczne wykrywanie metody połączenia (bez konieczności instalowania zewnętrznych
pakietów pip, jeśli używany jest kontener Docker / Podman lub narzędzie `psql`):
  1. Biblioteka Pythona `psycopg` (v3) lub `psycopg2` (jeśli zainstalowana i port DB jest dostępny)
  2. Lokalne narzędzie CLI `psql` (jeśli zainstalowane i port DB jest dostępny)
  3. Kontener `podman exec` / `docker exec` (domyślnie `inzynierka-psql` z `docker-compose.yml`)
  4. Wygenerowanie czystego pliku / strumienia SQL (`--mode sql` lub `--output seed.sql`)

Przykłady użycia:
  python3 scripts/seed_db.py
  python3 scripts/seed_db.py --reset
  python3 scripts/seed_db.py --mode container --container inzynierka-psql --reset
  python3 scripts/seed_db.py --mode sql --output seed.sql
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
import os
from pathlib import Path
import shutil
import socket
import struct
import subprocess
import sys
import uuid
import zlib


SEED_NAMESPACE = uuid.UUID("9f65c4b2-49e8-4a1d-9c5a-7a3e6b210914")

DEFAULT_USER_PASSWORD = "WinnicaHaslo2026!"
# Zweryfikowany hash BCrypt ($2a$10$) kompatybilny ze Spring Security BCryptPasswordEncoder
DEFAULT_BCRYPT_HASH = "$2a$10$zSfVkp9q//Eeo/PRp1gipOBHJi4CqsLZXssArzbyk4pz37DbXE5O2"


def seed_uuid(key: str) -> str:
    """Generuje deterministyczny identyfikator UUID na podstawie klucza tekstowego."""
    return str(uuid.uuid5(SEED_NAMESPACE, key))


def make_emblem_png(
    bg_rgb: tuple[int, int, int],
    border_rgb: tuple[int, int, int],
    accent_rgb: tuple[int, int, int],
    size: int = 64,
) -> bytes:
    """Generuje prawidłowy obraz PNG (64x64 RGBA) z prostym emblematem winnicy w czystym Pythonie."""
    rows: list[bytes] = []
    center = (size - 1) / 2.0
    outer_r2 = (size * 0.44) ** 2
    inner_r2 = (size * 0.38) ** 2
    grape_centers = [
        (center - 6, center - 4),
        (center + 6, center - 4),
        (center, center - 4),
        (center - 3, center + 3),
        (center + 3, center + 3),
        (center, center + 10),
    ]
    grape_r2 = 4.2**2

    for y in range(size):
        row = bytearray([0])  # filter type 0 (None)
        for x in range(size):
            dx = x - center
            dy = y - center
            dist2 = dx * dx + dy * dy

            if dist2 > outer_r2:
                row.extend((0, 0, 0, 0))
            elif dist2 > inner_r2:
                row.extend((*border_rgb, 255))
            else:
                in_grape = any((x - gx) ** 2 + (y - gy) ** 2 <= grape_r2 for gx, gy in grape_centers)
                in_stem = abs(x - center) <= 1.2 and (center - 13) <= y <= (center - 7)
                if in_grape or in_stem:
                    row.extend((*accent_rgb, 255))
                else:
                    row.extend((*bg_rgb, 255))
        rows.append(bytes(row))

    raw_data = b"".join(rows)

    def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw_data, level=9)
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", idat)
        + png_chunk(b"IEND", b"")
    )


def sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    escaped = value.replace("'", "''")
    return f"'{escaped}'"


def sql_bool(value: bool) -> str:
    return "TRUE" if value else "FALSE"


def sql_num(value: int | float | Decimal | None) -> str:
    if value is None:
        return "NULL"
    return str(value)


def sql_uuid(value: str | None) -> str:
    if value is None:
        return "NULL"
    return f"'{value}'::uuid"


def sql_date(value: date | None) -> str:
    if value is None:
        return "NULL"
    return f"DATE '{value.isoformat()}'"


def sql_ts(value: datetime | None) -> str:
    if value is None:
        return "NULL"
    return f"TIMESTAMP '{value.strftime('%Y-%m-%d %H:%M:%S')}'"


def sql_tstz(value: datetime | None) -> str:
    if value is None:
        return "NULL"
    utc_val = value.astimezone(timezone.utc)
    return f"TIMESTAMPTZ '{utc_val.strftime('%Y-%m-%d %H:%M:%S+00')}'"


def sql_bytea(data: bytes) -> str:
    return f"decode('{data.hex()}', 'hex')"


@dataclass(frozen=True)
class TaskSeed:
    key: str
    org_id: str
    created_by_email: str
    creator_role: str
    assigned_to_email: str
    task_type: str
    name: str
    description: str | None
    field_id: str | None = None
    equipment_id: str | None = None
    substance_id: str | None = None
    batch_id: str | None = None
    bottling_id: str | None = None
    record_id: str | None = None
    started_at: date | None = None
    completed_at: date | None = None
    due_date: date | None = None


def validate_task_seed(t: TaskSeed) -> None:
    """Weryfikuje zgodność zadania z ograniczeniem SQL `chk_task_type_relations`."""
    valid_types = {"GENERAL", "SPRAYING", "HARVEST", "FIELD_WORK", "EQUIPMENT_MAINTENANCE"}
    if t.task_type not in valid_types:
        raise ValueError(f"Nieprawidłowy typ zadania: {t.task_type}")

    if t.task_type == "SPRAYING":
        assert t.field_id is not None and t.substance_id is not None, f"{t.key}: SPRAYING wymaga pola i substancji"
        assert t.batch_id is None and t.bottling_id is None and t.record_id is None
    elif t.task_type in {"HARVEST", "FIELD_WORK"}:
        assert t.field_id is not None, f"{t.key}: {t.task_type} wymaga pola"
        assert (
            t.substance_id is None
            and t.batch_id is None
            and t.bottling_id is None
            and t.record_id is None
        )
    elif t.task_type == "EQUIPMENT_MAINTENANCE":
        assert t.equipment_id is not None and t.field_id is None, f"{t.key}: wymaga sprzętu bez pola"
        assert (
            t.substance_id is None
            and t.batch_id is None
            and t.bottling_id is None
            and t.record_id is None
        )


def resolve_password_sql_expr(user_password: str) -> tuple[list[str], str]:
    """
    Zwraca (dodatkowe instrukcje SQL przed insertem, wyrażenie SQL z hashem hasła).
    Dla domyślnego hasła korzysta z gotowego hasha BCrypt (zero zależności).
    Dla niestandardowego hasła używa biblioteki `bcrypt` (jeśli dostępna) lub rozszerzenia `pgcrypto`.
    """
    if user_password == DEFAULT_USER_PASSWORD:
        return [], sql_str(DEFAULT_BCRYPT_HASH)

    try:
        import bcrypt  # type: ignore[import-not-found]

        hashed = bcrypt.hashpw(
            user_password.encode("utf-8"),
            bcrypt.gensalt(rounds=10, prefix=b"2a"),
        ).decode("ascii")
        return [], sql_str(hashed)
    except ImportError:
        preamble = ["CREATE EXTENSION IF NOT EXISTS pgcrypto;"]
        expr = f"crypt({sql_str(user_password)}, gen_salt('bf', 10))"
        return preamble, expr


def build_seed_sql(ref_date: date, user_password: str, reset: bool) -> str:
    """Buduje kompletny, idempotentny skrypt transakcyjny SQL dla wszystkich tabel aplikacji."""
    lines: list[str] = []
    add = lines.append

    def dt(days_offset: int, hour: int = 10, minute: int = 0) -> datetime:
        d = ref_date + timedelta(days=days_offset)
        return datetime.combine(d, time(hour, minute), tzinfo=timezone.utc)

    def d_off(days_offset: int) -> date:
        return ref_date + timedelta(days=days_offset)

    add("-- Automatycznie wygenerowany skrypt zasilający bazę danych (seed_db.py)")
    add("BEGIN;")
    add("")
    add("-- Sprawdzenie, czy schemat Liquibase został już utworzony")
    add(
        """DO $$
BEGIN
    IF to_regclass('public.organisation') IS NULL OR to_regclass('public.offering') IS NULL THEN
        RAISE EXCEPTION 'Schemat bazy danych nie istnieje! Uruchom najpierw backend (Spring Boot / Liquibase) lub wykonaj: cd backend && mvn liquibase:update';
    END IF;
END $$;"""
    )
    add("")

    if reset:
        add("-- Czyszczenie istniejących danych aplikacyjnych (z zachowaniem tabel Liquibase)")
        add(
            """TRUNCATE TABLE
    offering,
    task,
    record,
    bottling,
    batch_source,
    harvest_batch,
    batch,
    spraying,
    pest_observation,
    field_harvest,
    harvest,
    equipment,
    substance,
    field,
    password_reset_token,
    users_roles,
    _user,
    organisation_logo,
    organisation
CASCADE;"""
        )
        add("")

    pwd_preamble, pwd_expr = resolve_password_sql_expr(user_password)
    for stmt in pwd_preamble:
        add(stmt)

    # =========================================================================
    # 1. ORGANIZACJE + LOGOTYPY
    # =========================================================================
    org1_id = seed_uuid("org:dolina-pradnika")
    org2_id = seed_uuid("org:sandomierskie-wzgorza")

    orgs = [
        (
            org1_id,
            "Winnica Dolina Prądnika",
            "6762581429",
            "ul. Winnicka 14",
            "32-043",
            "Skała",
            f"/api/organisations/{org1_id}/logo",
            "Tradycja jurajskich stoków zamknięta w każdej butelce",
            dt(-720, 9, 0),
        ),
        (
            org2_id,
            "Winnica Sandomierskie Wzgórza",
            "8641927350",
            "ul. Królowej Jadwigi 8",
            "27-600",
            "Sandomierz",
            f"/api/organisations/{org2_id}/logo",
            "Słońce lessowych wąwozów nad Wisłą",
            dt(-540, 11, 30),
        ),
    ]

    add("-- 1. Organizacje")
    for oid, name, tax_id, street, postal, city, logo_path, motto, created_at in orgs:
        add(
            f"""INSERT INTO organisation (id, active, name, tax_id, street, postal_code, city, logo_path, motto, created_at)
VALUES ({sql_uuid(oid)}, TRUE, {sql_str(name)}, {sql_str(tax_id)}, {sql_str(street)}, {sql_str(postal)}, {sql_str(city)}, {sql_str(logo_path)}, {sql_str(motto)}, {sql_ts(created_at)})
ON CONFLICT (id) DO UPDATE SET
    active = EXCLUDED.active,
    name = EXCLUDED.name,
    tax_id = EXCLUDED.tax_id,
    street = EXCLUDED.street,
    postal_code = EXCLUDED.postal_code,
    city = EXCLUDED.city,
    logo_path = EXCLUDED.logo_path,
    motto = EXCLUDED.motto;"""
        )

    logo1_bytes = make_emblem_png((63, 46, 34), (201, 164, 106), (164, 58, 76))
    logo2_bytes = make_emblem_png((45, 62, 40), (212, 178, 106), (222, 196, 118))

    add("")
    add("-- 2. Logotypy organizacji")
    for oid, logo_bytes in [(org1_id, logo1_bytes), (org2_id, logo2_bytes)]:
        add(
            f"""INSERT INTO organisation_logo (organisation_id, content_type, image_data, file_size, updated_at)
VALUES ({sql_uuid(oid)}, 'image/png', {sql_bytea(logo_bytes)}, {len(logo_bytes)}, {sql_ts(dt(-30, 12, 0))})
ON CONFLICT (organisation_id) DO UPDATE SET
    content_type = EXCLUDED.content_type,
    image_data = EXCLUDED.image_data,
    file_size = EXCLUDED.file_size,
    updated_at = EXCLUDED.updated_at;"""
        )

    # =========================================================================
    # 2. UŻYTKOWNICY I ROLE
    # =========================================================================
    u_owner = seed_uuid("user:owner@winnica.pl")
    u_enolog = seed_uuid("user:enolog@winnica.pl")
    u_worker1 = seed_uuid("user:pracownik@winnica.pl")
    u_worker2 = seed_uuid("user:pracownik2@winnica.pl")
    u_full = seed_uuid("user:full@winnica.pl")
    u_pending = seed_uuid("user:zaproszony@winnica.pl")
    u_free = seed_uuid("user:wolny@winnica.pl")
    u_owner2 = seed_uuid("user:owner@sandomierz-wino.pl")

    users = [
        (u_owner, "owner@winnica.pl", "Jan", "Kowalski", "+48 601 234 567", "MEMBER", org1_id, ["OWNER"]),
        (u_enolog, "enolog@winnica.pl", "Anna", "Nowak", "+48 602 345 678", "MEMBER", org1_id, ["OENOLOGIST"]),
        (u_worker1, "pracownik@winnica.pl", "Piotr", "Wiśniewski", "+48 603 456 789", "MEMBER", org1_id, ["WORKER"]),
        (u_worker2, "pracownik2@winnica.pl", "Katarzyna", "Wójcik", "+48 604 567 890", "MEMBER", org1_id, ["WORKER"]),
        (u_full, "full@winnica.pl", "Marek", "Zieliński", "+48 605 678 901", "MEMBER", org1_id, ["OENOLOGIST", "WORKER"]),
        (u_pending, "zaproszony@winnica.pl", "Tomasz", "Kamiński", "+48 606 789 012", "PENDING", org1_id, []),
        (u_free, "wolny@winnica.pl", "Magdalena", "Lewandowska", "+48 607 890 123", "NONE", None, []),
        (u_owner2, "owner@sandomierz-wino.pl", "Krzysztof", "Dąbrowski", "+48 608 901 234", "MEMBER", org2_id, ["OWNER"]),
    ]

    add("")
    add("-- 3. Użytkownicy i role")
    for uid, email, fname, lname, phone, m_status, oid, roles in users:
        add(
            f"""INSERT INTO _user (id, active, email, firstname, lastname, membership_status, password, phone_number, organisation_id)
VALUES ({sql_uuid(uid)}, TRUE, {sql_str(email)}, {sql_str(fname)}, {sql_str(lname)}, {sql_str(m_status)}, {pwd_expr}, {sql_str(phone)}, {sql_uuid(oid)})
ON CONFLICT (email) DO UPDATE SET
    active = EXCLUDED.active,
    firstname = EXCLUDED.firstname,
    lastname = EXCLUDED.lastname,
    membership_status = EXCLUDED.membership_status,
    password = EXCLUDED.password,
    phone_number = EXCLUDED.phone_number,
    organisation_id = EXCLUDED.organisation_id;"""
        )
        for role in roles:
            add(
                f"""INSERT INTO users_roles (user_id, role)
SELECT id, {sql_str(role)} FROM _user WHERE email = {sql_str(email)}
ON CONFLICT (user_id, role) DO NOTHING;"""
            )

    # =========================================================================
    # 3. DZIAŁKI WINNICY (FIELD)
    # =========================================================================
    f_solaris = seed_uuid("field:org1:solaris")
    f_johanniter = seed_uuid("field:org1:johanniter")
    f_riesling = seed_uuid("field:org1:riesling")
    f_regent = seed_uuid("field:org1:regent")
    f_pinot = seed_uuid("field:org1:pinot-noir")
    f_zweigelt = seed_uuid("field:org1:zweigelt")

    f2_chardonnay = seed_uuid("field:org2:chardonnay")
    f2_cabernet = seed_uuid("field:org2:cabernet-cortis")

    fields = [
        (f_solaris, org1_id, "SOLARIS", None, "WHITE", Decimal("145.50")),
        (f_johanniter, org1_id, "JOHANNITER", None, "WHITE", Decimal("110.00")),
        (f_riesling, org1_id, "RIESLING", None, "WHITE", Decimal("95.25")),
        (f_regent, org1_id, "REGENT", None, "RED", Decimal("130.00")),
        (f_pinot, org1_id, "PINOT_NOIR", None, "RED", Decimal("85.00")),
        (f_zweigelt, org1_id, "OTHER", "Zweigelt", "RED", Decimal("60.00")),
        (f2_chardonnay, org2_id, "CHARDONNAY", None, "WHITE", Decimal("120.00")),
        (f2_cabernet, org2_id, "CABERNET_CORTIS", None, "RED", Decimal("90.00")),
    ]

    add("")
    add("-- 4. Działki uprawne (field)")
    for fid, oid, variety, other_var, color, area in fields:
        add(
            f"""INSERT INTO field (id, organisation_id, grape_variety, other_grape_variety, grape_color, area_are, active)
VALUES ({sql_uuid(fid)}, {sql_uuid(oid)}, {sql_str(variety)}, {sql_str(other_var)}, {sql_str(color)}, {sql_num(area)}, TRUE)
ON CONFLICT (id) DO UPDATE SET
    grape_variety = EXCLUDED.grape_variety,
    other_grape_variety = EXCLUDED.other_grape_variety,
    grape_color = EXCLUDED.grape_color,
    area_are = EXCLUDED.area_are,
    active = EXCLUDED.active;"""
        )

    # =========================================================================
    # 4. SPRZĘT WINNICY I WINIARNI (EQUIPMENT)
    # Typy zgodne z EQUIPMENT_TYPE_PRESETS w frontendzie (obsługa kodów QR!)
    # =========================================================================
    eq_press = seed_uuid("eq:org1:press-1")
    eq_ferm1 = seed_uuid("eq:org1:fermentor-1")
    eq_ferm2 = seed_uuid("eq:org1:fermentor-2")
    eq_barrel1 = seed_uuid("eq:org1:barrel-1")
    eq_barrel2 = seed_uuid("eq:org1:barrel-2")
    eq_tank1 = seed_uuid("eq:org1:tank-1")
    eq_mixer = seed_uuid("eq:org1:mixer-1")
    eq_bottling = seed_uuid("eq:org1:bottling-1")
    eq_sprayer = seed_uuid("eq:org1:sprayer-1")
    eq_tractor = seed_uuid("eq:org1:tractor-1")

    eq2_ferm = seed_uuid("eq:org2:fermentor-1")
    eq2_bottling = seed_uuid("eq:org2:bottling-1")
    eq2_sprayer = seed_uuid("eq:org2:sprayer-1")

    equipments = [
        (eq_press, org1_id, "Prasa pneumatyczna Bucher XPlus 22", "Press", d_off(240)),
        (eq_ferm1, org1_id, "Fermentor stalowy F-101 (2000 L)", "Fermentor", d_off(185)),
        (eq_ferm2, org1_id, "Fermentor stalowy F-102 (1500 L)", "Fermentor", d_off(21)),
        (eq_barrel1, org1_id, "Beczka dębowa francuska Barrique #1", "Barrel", None),
        (eq_barrel2, org1_id, "Beczka dębowa węgierska #2", "Barrel", None),
        (eq_tank1, org1_id, "Zbiornik leżakowy Inox T-301", "Tank", d_off(310)),
        (eq_mixer, org1_id, "Mieszalnik kupażowy M-10", "Mixer", d_off(150)),
        (eq_bottling, org1_id, "Linia rozlewnicza GAI 1205", "Bottling line", d_off(95)),
        (eq_sprayer, org1_id, "Opryskiwacz sadowniczy Krukowiak Apollo", "Sprayer", d_off(14)),
        (eq_tractor, org1_id, "Ciągnik winniczy Antonio Carraro TTR 4400", "Tractor", d_off(-9)),
        (eq2_ferm, org2_id, "Fermentor Inox S-01 (1200 L)", "Fermentor", d_off(200)),
        (eq2_bottling, org2_id, "Linia rozlewnicza Enolmaster", "Bottling line", d_off(160)),
        (eq2_sprayer, org2_id, "Opryskiwacz zawieszany Bury Wulkan", "Sprayer", d_off(120)),
    ]

    add("")
    add("-- 5. Sprzęt (equipment)")
    for eid, oid, name, eq_type, inspection in equipments:
        add(
            f"""INSERT INTO equipment (id, organisation_id, name, type, end_of_technical_inspection, active)
VALUES ({sql_uuid(eid)}, {sql_uuid(oid)}, {sql_str(name)}, {sql_str(eq_type)}, {sql_date(inspection)}, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    end_of_technical_inspection = EXCLUDED.end_of_technical_inspection,
    active = EXCLUDED.active;"""
        )

    # =========================================================================
    # 5. ŚRODKI OCHRONY ROŚLIN / SUBSTANCJE (SUBSTANCE)
    # =========================================================================
    sub_siarkol = seed_uuid("sub:org1:siarkol")
    sub_miedzian = seed_uuid("sub:org1:miedzian")
    sub_switch = seed_uuid("sub:org1:switch")
    sub_topas = seed_uuid("sub:org1:topas")
    sub_ridomil = seed_uuid("sub:org1:ridomil")
    sub2_siarkol = seed_uuid("sub:org2:siarkol")

    substances = [
        (sub_siarkol, org1_id, "Siarkol Extra 80 WP"),
        (sub_miedzian, org1_id, "Miedzian 50 WP"),
        (sub_switch, org1_id, "Switch 62.5 WG"),
        (sub_topas, org1_id, "Topas 100 EC"),
        (sub_ridomil, org1_id, "Ridomil Gold MZ Pepite 67.8 WG"),
        (sub2_siarkol, org2_id, "Siarkol Extra 80 WP"),
    ]

    add("")
    add("-- 6. Substancje / środki ochrony roślin (substance)")
    for sid, oid, name in substances:
        add(
            f"""INSERT INTO substance (id, organisation_id, name, active)
VALUES ({sql_uuid(sid)}, {sql_uuid(oid)}, {sql_str(name)}, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    active = EXCLUDED.active;"""
        )

    # =========================================================================
    # 6. OBSERWACJE SZKODNIKÓW I CHORÓB (PEST_OBSERVATION)
    # =========================================================================
    pests = [
        (
            seed_uuid("pest:1"),
            org1_id,
            f_solaris,
            "DISEASE",
            "Mączniak prawdziwy winorośli",
            d_off(-165),
            "Biały, mączysty nalot na górnej stronie liści w rzędach 4-8; zalecono oprysk siarkowy.",
        ),
        (
            seed_uuid("pest:2"),
            org1_id,
            f_regent,
            "DISEASE",
            "Mączniak rzekomy winorośli",
            d_off(-130),
            "Pojedyncze plamy olejowe po intensywnych opadach deszczu na południowej ekspozycji.",
        ),
        (
            seed_uuid("pest:3"),
            org1_id,
            f_johanniter,
            "PEST",
            "Szpeciel pilśniowiec winoroślowy",
            d_off(-110),
            "Niewielkie deformacje blaszki liściowej na młodych pędach brzegowych.",
        ),
        (
            seed_uuid("pest:4"),
            org1_id,
            f_riesling,
            "DISEASE",
            "Szara pleśń (Botrytis cinerea)",
            d_off(-68),
            "Ogniska pleśni w zwartych gronach przed zbiorem; wykonano defoliację strefy gron.",
        ),
        (
            seed_uuid("pest:5"),
            org1_id,
            f_pinot,
            "PEST",
            "Zwójka kwasigroneczka",
            d_off(-45),
            "Odłowiono 14 osobników w pułapkach feromonowych w ciągu tygodnia.",
        ),
        (
            seed_uuid("pest:6"),
            org1_id,
            f_zweigelt,
            "PEST",
            "Skoczek winoroślowy",
            d_off(-18),
            "Żerowanie na dolnych liściach krzewów, próg szkodliwości pod obserwacją.",
        ),
    ]

    add("")
    add("-- 7. Obserwacje szkodników i chorób (pest_observation)")
    for pid, oid, fid, ptype, name, obs_date, desc in pests:
        add(
            f"""INSERT INTO pest_observation (id, organisation_id, field_id, type, name, observed_at, description, active)
VALUES ({sql_uuid(pid)}, {sql_uuid(oid)}, {sql_uuid(fid)}, {sql_str(ptype)}, {sql_str(name)}, {sql_date(obs_date)}, {sql_str(desc)}, TRUE)
ON CONFLICT (id) DO UPDATE SET
    field_id = EXCLUDED.field_id,
    type = EXCLUDED.type,
    name = EXCLUDED.name,
    observed_at = EXCLUDED.observed_at,
    description = EXCLUDED.description,
    active = EXCLUDED.active;"""
        )

    # =========================================================================
    # 7. OPRYSKI WYKONANE ORAZ ZAPLANOWANE (SPRAYING)
    # Przyszłe daty `spraying_date` są automatycznie traktowane jako zaplanowane w UI!
    # =========================================================================
    sprayings = [
        # Wykonane
        (seed_uuid("spray:1"), org1_id, f_solaris, eq_sprayer, sub_miedzian, dt(-175, 7, 30), 4, dt(-161, 7, 30)),
        (seed_uuid("spray:2"), org1_id, f_solaris, eq_sprayer, sub_siarkol, dt(-160, 8, 0), 6, dt(-146, 8, 0)),
        (seed_uuid("spray:3"), org1_id, f_regent, eq_sprayer, sub_ridomil, dt(-128, 6, 45), 3, dt(-100, 6, 45)),
        (seed_uuid("spray:4"), org1_id, f_johanniter, eq_sprayer, sub_topas, dt(-95, 7, 15), 2, dt(-74, 7, 15)),
        (seed_uuid("spray:5"), org1_id, f_riesling, eq_sprayer, sub_switch, dt(-65, 8, 30), 3, dt(-44, 8, 30)),
        (seed_uuid("spray:6"), org1_id, f_pinot, eq_sprayer, sub_switch, dt(-52, 7, 0), 2, dt(-31, 7, 0)),
        # Zaplanowane (w przyszłości)
        (seed_uuid("spray:plan-1"), org1_id, f_solaris, eq_sprayer, sub_miedzian, dt(4, 7, 30), 4, dt(18, 7, 30)),
        (seed_uuid("spray:plan-2"), org1_id, f_regent, eq_sprayer, sub_siarkol, dt(9, 8, 0), 5, dt(23, 8, 0)),
        (seed_uuid("spray:plan-3"), org1_id, f_zweigelt, eq_sprayer, sub_topas, dt(16, 7, 0), 2, dt(30, 7, 0)),
        # Druga winnica
        (seed_uuid("spray:org2-1"), org2_id, f2_chardonnay, eq2_sprayer, sub2_siarkol, dt(-80, 8, 0), 4, dt(-60, 8, 0)),
    ]

    add("")
    add("-- 8. Opryski (spraying)")
    for sp_id, oid, fid, eid, sid, sp_date, qty, due in sprayings:
        add(
            f"""INSERT INTO spraying (id, organisation_id, field_id, equipment_id, substance_id, spraying_date, quantity, due)
VALUES ({sql_uuid(sp_id)}, {sql_uuid(oid)}, {sql_uuid(fid)}, {sql_uuid(eid)}, {sql_uuid(sid)}, {sql_tstz(sp_date)}, {sql_num(qty)}, {sql_tstz(due)})
ON CONFLICT (id) DO UPDATE SET
    field_id = EXCLUDED.field_id,
    equipment_id = EXCLUDED.equipment_id,
    substance_id = EXCLUDED.substance_id,
    spraying_date = EXCLUDED.spraying_date,
    quantity = EXCLUDED.quantity,
    due = EXCLUDED.due;"""
        )

    # =========================================================================
    # 8. ZBIORY WINOGRON (HARVEST + FIELD_HARVEST) — 3 sezony pod raporty trendów!
    # =========================================================================
    h_2024_solaris = seed_uuid("harvest:org1:2024-solaris")
    h_2024_regent = seed_uuid("harvest:org1:2024-regent")
    h_2025_solaris = seed_uuid("harvest:org1:2025-solaris")
    h_2025_white_blend = seed_uuid("harvest:org1:2025-johanniter-riesling")
    h_2025_red = seed_uuid("harvest:org1:2025-regent-pinot")
    h_cur_solaris = seed_uuid("harvest:org1:cur-solaris")
    h_cur_johanniter = seed_uuid("harvest:org1:cur-johanniter")
    h_cur_riesling = seed_uuid("harvest:org1:cur-riesling")
    h_cur_pinot = seed_uuid("harvest:org1:cur-pinot")
    h_cur_zweigelt = seed_uuid("harvest:org1:cur-zweigelt")

    h2_chardonnay = seed_uuid("harvest:org2:chardonnay")

    harvests = [
        # Sezon -2 lata
        (h_2024_solaris, org1_id, d_off(-760), 3900, [f_solaris]),
        (h_2024_regent, org1_id, d_off(-735), 3400, [f_regent]),
        # Sezon -1 rok (wina zabutelkowane i będące obecnie w ofercie!)
        (h_2025_solaris, org1_id, d_off(-410), 4600, [f_solaris]),
        (h_2025_white_blend, org1_id, d_off(-395), 4200, [f_johanniter, f_riesling]),
        (h_2025_red, org1_id, d_off(-380), 4800, [f_regent, f_pinot]),
        # Bieżący sezon (partie w trakcie winifikacji i dojrzewania)
        (h_cur_solaris, org1_id, d_off(-75), 4450, [f_solaris]),
        (h_cur_johanniter, org1_id, d_off(-60), 3100, [f_johanniter]),
        (h_cur_riesling, org1_id, d_off(-42), 2650, [f_riesling]),
        (h_cur_pinot, org1_id, d_off(-50), 2300, [f_pinot]),
        (h_cur_zweigelt, org1_id, d_off(-35), 1450, [f_zweigelt]),
        # Druga winnica
        (h2_chardonnay, org2_id, d_off(-390), 3600, [f2_chardonnay]),
    ]

    add("")
    add("-- 9. Zbiory (harvest oraz field_harvest)")
    for hid, oid, h_date, amount_kg, field_ids in harvests:
        add(
            f"""INSERT INTO harvest (id, organisation_id, harvest_date, amount_kg, active)
VALUES ({sql_uuid(hid)}, {sql_uuid(oid)}, {sql_date(h_date)}, {sql_num(amount_kg)}, TRUE)
ON CONFLICT (id) DO UPDATE SET
    harvest_date = EXCLUDED.harvest_date,
    amount_kg = EXCLUDED.amount_kg,
    active = EXCLUDED.active;"""
        )
        for fid in field_ids:
            add(
                f"""INSERT INTO field_harvest (field_id, harvest_id)
VALUES ({sql_uuid(fid)}, {sql_uuid(hid)})
ON CONFLICT (field_id, harvest_id) DO NOTHING;"""
            )

    # =========================================================================
    # 9. PARTIE PRODUKCYJNE (BATCH), POWIĄZANIA ZE ZBIORAMI I PARTIAMI
    # =========================================================================
    # Linia 1: Solaris Klasyczne (MUST -> FERMENTING -> BOTTLED)
    b_sol_must = seed_uuid("batch:org1:solaris-2025-must")
    b_sol_ferm = seed_uuid("batch:org1:solaris-2025-ferm")
    b_sol_bottled = seed_uuid("batch:org1:solaris-2025-bottled")

    # Linia 2: Jurajskie Czerwone Reserve (FERMENTING -> AGED -> BLENDED -> BOTTLED)
    b_red_ferm = seed_uuid("batch:org1:red-2025-ferm")
    b_red_aged = seed_uuid("batch:org1:red-2025-aged")
    b_red_blend = seed_uuid("batch:org1:red-2025-blend")
    b_red_bottled = seed_uuid("batch:org1:red-2025-bottled")

    # Linia 3: Dolina Prądnika Cuvée Białe (FERMENTING -> BOTTLED)
    b_cuvee_ferm = seed_uuid("batch:org1:cuvee-2025-ferm")
    b_cuvee_bottled = seed_uuid("batch:org1:cuvee-2025-bottled")

    # Aktywne partie bieżącego rocznika (na każdym etapie winiarni + 1 zepsuta)
    b_cur_must = seed_uuid("batch:org1:cur-riesling-must")
    b_cur_ferm = seed_uuid("batch:org1:cur-johanniter-ferm")
    b_cur_aged = seed_uuid("batch:org1:cur-pinot-aged")
    b_cur_blend = seed_uuid("batch:org1:cur-white-blend")
    b_cur_spoiled = seed_uuid("batch:org1:cur-zweigelt-spoiled")

    # Druga winnica
    b2_chard_bottled = seed_uuid("batch:org2:chardonnay-bottled")

    batches = [
        (b_sol_must, org1_id, "Solaris Moszcz Jesienny", "MUST", Decimal("2200.00"), False, dt(-409, 14, 0)),
        (b_sol_ferm, org1_id, "Solaris Fermentacja Chłodna", "FERMENTING", Decimal("2100.00"), False, dt(-405, 10, 0)),
        (b_sol_bottled, org1_id, "Solaris Skała Klasyczne", "BOTTLED", Decimal("1950.00"), False, dt(-260, 11, 0)),
        (b_red_ferm, org1_id, "Regent & Pinot Maceracja", "FERMENTING", Decimal("2400.00"), False, dt(-378, 15, 0)),
        (b_red_aged, org1_id, "Regent Barrique Francuskie", "AGED", Decimal("2250.00"), False, dt(-340, 12, 0)),
        (b_red_blend, org1_id, "Kupaż Czerwony Jurajski Reserve", "BLENDED", Decimal("2150.00"), False, dt(-150, 11, 0)),
        (b_red_bottled, org1_id, "Jurajskie Czerwone Reserve Barrique", "BOTTLED", Decimal("2050.00"), False, dt(-110, 9, 30)),
        (b_cuvee_ferm, org1_id, "Johanniter & Riesling Fermentacja", "FERMENTING", Decimal("2000.00"), False, dt(-393, 13, 0)),
        (b_cuvee_bottled, org1_id, "Dolina Prądnika Cuvée Białe", "BOTTLED", Decimal("1850.00"), False, dt(-230, 10, 30)),
        (b_cur_must, org1_id, "Riesling Tłoczenie Delikatne", "MUST", Decimal("1850.00"), False, dt(-41, 16, 0)),
        (b_cur_ferm, org1_id, "Johanniter Fermentacja F-101", "FERMENTING", Decimal("2150.00"), False, dt(-58, 11, 0)),
        (b_cur_aged, org1_id, "Pinot Noir Barrique #1", "AGED", Decimal("1550.00"), False, dt(-46, 14, 0)),
        (b_cur_blend, org1_id, "Solaris & Johanniter Kupaż Młody", "BLENDED", Decimal("2600.00"), False, dt(-20, 10, 0)),
        (b_cur_spoiled, org1_id, "Partia Testowa Zweigelt (Utleniona)", "FERMENTING", Decimal("420.00"), True, dt(-32, 12, 0)),
        (b2_chard_bottled, org2_id, "Sandomierskie Chardonnay Sur Lie", "BOTTLED", Decimal("2400.00"), False, dt(-210, 10, 0)),
    ]

    add("")
    add("-- 10. Partie winiarskie (batch)")
    for bid, oid, name, stage, qty, spoiled, created_at in batches:
        add(
            f"""INSERT INTO batch (id, organisation_id, name, stage, quantity, is_spoiled, deleted, created_at)
VALUES ({sql_uuid(bid)}, {sql_uuid(oid)}, {sql_str(name)}, {sql_str(stage)}, {sql_num(qty)}, {sql_bool(spoiled)}, FALSE, {sql_ts(created_at)})
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    stage = EXCLUDED.stage,
    quantity = EXCLUDED.quantity,
    is_spoiled = EXCLUDED.is_spoiled,
    deleted = EXCLUDED.deleted,
    created_at = EXCLUDED.created_at;"""
        )

    # Powiązania zbiór -> partia (suma dla każdego zbioru <= amount_kg)
    harvest_batches = [
        (seed_uuid("hb:1"), org1_id, h_2025_solaris, b_sol_must, Decimal("2400.00")),
        (seed_uuid("hb:2"), org1_id, h_2025_solaris, b_sol_bottled, Decimal("2100.00")),
        (seed_uuid("hb:3"), org1_id, h_2025_red, b_red_ferm, Decimal("2500.00")),
        (seed_uuid("hb:4"), org1_id, h_2025_red, b_red_bottled, Decimal("2200.00")),
        (seed_uuid("hb:5"), org1_id, h_2025_white_blend, b_cuvee_ferm, Decimal("2150.00")),
        (seed_uuid("hb:6"), org1_id, h_2025_white_blend, b_cuvee_bottled, Decimal("1950.00")),
        (seed_uuid("hb:7"), org1_id, h_cur_riesling, b_cur_must, Decimal("2400.00")),
        (seed_uuid("hb:8"), org1_id, h_cur_johanniter, b_cur_ferm, Decimal("2800.00")),
        (seed_uuid("hb:9"), org1_id, h_cur_pinot, b_cur_aged, Decimal("2100.00")),
        (seed_uuid("hb:10"), org1_id, h_cur_solaris, b_cur_blend, Decimal("3200.00")),
        (seed_uuid("hb:11"), org1_id, h_cur_zweigelt, b_cur_spoiled, Decimal("650.00")),
        (seed_uuid("hb:org2:1"), org2_id, h2_chardonnay, b2_chard_bottled, Decimal("3200.00")),
    ]

    add("")
    add("-- 11. Źródła zbiorów dla partii (harvest_batch)")
    for hbid, oid, hid, bid, qty in harvest_batches:
        add(
            f"""INSERT INTO harvest_batch (id, organisation_id, harvest_id, batch_id, quantity)
VALUES ({sql_uuid(hbid)}, {sql_uuid(oid)}, {sql_uuid(hid)}, {sql_uuid(bid)}, {sql_num(qty)})
ON CONFLICT (id) DO UPDATE SET
    harvest_id = EXCLUDED.harvest_id,
    batch_id = EXCLUDED.batch_id,
    quantity = EXCLUDED.quantity;"""
        )

    # Powiązania partia -> partia (quantity <= source_batch.quantity)
    batch_sources = [
        (seed_uuid("bs:1"), org1_id, b_sol_must, b_sol_ferm, Decimal("2100.00")),
        (seed_uuid("bs:2"), org1_id, b_sol_ferm, b_sol_bottled, Decimal("1950.00")),
        (seed_uuid("bs:3"), org1_id, b_red_ferm, b_red_aged, Decimal("2250.00")),
        (seed_uuid("bs:4"), org1_id, b_red_aged, b_red_blend, Decimal("2150.00")),
        (seed_uuid("bs:5"), org1_id, b_red_blend, b_red_bottled, Decimal("2050.00")),
        (seed_uuid("bs:6"), org1_id, b_cuvee_ferm, b_cuvee_bottled, Decimal("1850.00")),
        (seed_uuid("bs:7"), org1_id, b_cur_ferm, b_cur_blend, Decimal("850.00")),
    ]

    add("")
    add("-- 12. Przepływy między partiami (batch_source)")
    for bsid, oid, src_id, dst_id, qty in batch_sources:
        add(
            f"""INSERT INTO batch_source (id, organisation_id, source_batch_id, target_batch_id, quantity)
VALUES ({sql_uuid(bsid)}, {sql_uuid(oid)}, {sql_uuid(src_id)}, {sql_uuid(dst_id)}, {sql_num(qty)})
ON CONFLICT (source_batch_id, target_batch_id) DO UPDATE SET
    quantity = EXCLUDED.quantity;"""
        )

    # =========================================================================
    # 10. POMIARY LABORATORYJNE PARTII (RECORD)
    # =========================================================================
    rec_ferm_latest = seed_uuid("rec:cur-ferm-4")
    records = [
        # Przebieg fermentacji aktywnej partii Johanniter F-101
        (seed_uuid("rec:cur-ferm-1"), org1_id, b_cur_ferm, Decimal("224.00"), Decimal("7.40"), Decimal("3.22"), Decimal("15.50"), Decimal("0.00"), dt(-57, 9, 0)),
        (seed_uuid("rec:cur-ferm-2"), org1_id, b_cur_ferm, Decimal("148.50"), Decimal("7.10"), Decimal("3.26"), Decimal("16.80"), Decimal("4.40"), dt(-50, 9, 0)),
        (seed_uuid("rec:cur-ferm-3"), org1_id, b_cur_ferm, Decimal("54.20"), Decimal("6.85"), Decimal("3.29"), Decimal("16.20"), Decimal("9.60"), dt(-40, 9, 0)),
        (rec_ferm_latest, org1_id, b_cur_ferm, Decimal("6.80"), Decimal("6.60"), Decimal("3.31"), Decimal("14.90"), Decimal("12.40"), dt(-12, 9, 0)),
        # Świeży moszcz Riesling
        (seed_uuid("rec:cur-must-1"), org1_id, b_cur_must, Decimal("212.00"), Decimal("8.30"), Decimal("3.12"), Decimal("12.40"), Decimal("0.00"), dt(-40, 17, 0)),
        # Pinot Noir w beczce
        (seed_uuid("rec:cur-aged-1"), org1_id, b_cur_aged, Decimal("2.10"), Decimal("5.60"), Decimal("3.58"), Decimal("13.20"), Decimal("13.10"), dt(-15, 11, 0)),
        # Kupaż biały
        (seed_uuid("rec:cur-blend-1"), org1_id, b_cur_blend, Decimal("4.50"), Decimal("6.40"), Decimal("3.28"), Decimal("12.80"), Decimal("12.60"), dt(-8, 10, 30)),
        # Zepsuta partia (podwyższona kwasowość lotna / temperatura)
        (seed_uuid("rec:cur-spoiled-1"), org1_id, b_cur_spoiled, Decimal("18.40"), Decimal("9.80"), Decimal("3.84"), Decimal("24.50"), Decimal("10.20"), dt(-25, 14, 0)),
        # Zabutelkowane wina w ofercie
        (seed_uuid("rec:sol-bottled"), org1_id, b_sol_bottled, Decimal("3.20"), Decimal("6.50"), Decimal("3.24"), Decimal("12.00"), Decimal("12.80"), dt(-262, 10, 0)),
        (seed_uuid("rec:red-bottled"), org1_id, b_red_bottled, Decimal("2.40"), Decimal("5.40"), Decimal("3.62"), Decimal("14.00"), Decimal("13.50"), dt(-112, 10, 0)),
        (seed_uuid("rec:cuvee-bottled"), org1_id, b_cuvee_bottled, Decimal("9.80"), Decimal("6.90"), Decimal("3.21"), Decimal("11.80"), Decimal("11.90"), dt(-232, 10, 0)),
        (seed_uuid("rec:org2-chard"), org2_id, b2_chard_bottled, Decimal("2.80"), Decimal("6.10"), Decimal("3.36"), Decimal("12.50"), Decimal("13.00"), dt(-212, 11, 0)),
    ]

    add("")
    add("-- 13. Pomiary parametrów fizykochemicznych (record)")
    for rid, oid, bid, sugar, acid, ph, temp, abv, rec_at in records:
        add(
            f"""INSERT INTO record (id, organisation_id, batch_id, sugar_level, acidity, ph, temperature, alcohol_content, recorded_at, active)
VALUES ({sql_uuid(rid)}, {sql_uuid(oid)}, {sql_uuid(bid)}, {sql_num(sugar)}, {sql_num(acid)}, {sql_num(ph)}, {sql_num(temp)}, {sql_num(abv)}, {sql_tstz(rec_at)}, TRUE)
ON CONFLICT (id) DO UPDATE SET
    batch_id = EXCLUDED.batch_id,
    sugar_level = EXCLUDED.sugar_level,
    acidity = EXCLUDED.acidity,
    ph = EXCLUDED.ph,
    temperature = EXCLUDED.temperature,
    alcohol_content = EXCLUDED.alcohol_content,
    recorded_at = EXCLUDED.recorded_at,
    active = EXCLUDED.active;"""
        )

    # =========================================================================
    # 11. ROZLEWY / BUTELKOWANIA (BOTTLING) ORAZ OFERTA PUBLICZNA (OFFERING)
    # =========================================================================
    bot_solaris = seed_uuid("bottling:org1:solaris")
    bot_red = seed_uuid("bottling:org1:red-reserve")
    bot_cuvee = seed_uuid("bottling:org1:cuvee-biale")
    bot2_chard = seed_uuid("bottling:org2:chardonnay")

    bottlings = [
        (
            bot_solaris,
            org1_id,
            b_sol_bottled,
            "Solaris Skała Klasyczne",
            "Wytrawne białe wino z jurajskich stoków Doliny Prądnika. Aromaty dojrzałej gruszki, brzoskwini i kwiatu czarnego bzu z rześką mineralną końcówką.",
            Decimal("1950.00"),
            dt(-258, 13, 0),
        ),
        (
            bot_red,
            org1_id,
            b_red_bottled,
            "Jurajskie Czerwone Reserve Barrique",
            "Głębokie czerwone wino kupażowane ze szczepów Regent i Pinot Noir, dojrzewane przez 8 miesięcy w beczkach z dębu francuskiego. Nuty wiśni, gorzkiej czekolady i wanilii.",
            Decimal("2050.00"),
            dt(-108, 14, 0),
        ),
        (
            bot_cuvee,
            org1_id,
            b_cuvee_bottled,
            "Dolina Prądnika Cuvée Białe",
            "Harmonijne półwytrawne połączenie szczepów Johanniter oraz Riesling. Soczyste cytrusy, zielone jabłko i delikatna miodowa krągłość.",
            Decimal("1850.00"),
            dt(-228, 11, 30),
        ),
        (
            bot2_chard,
            org2_id,
            b2_chard_bottled,
            "Sandomierskie Chardonnay Sur Lie",
            "Eleganckie Chardonnay dojrzewające na osadzie drożdżowym z lessowych wzgórz pod Sandomierzem. Kremowa struktura z nutami pieczonego jabłka i brioszki.",
            Decimal("2400.00"),
            dt(-208, 12, 0),
        ),
    ]

    add("")
    add("-- 14. Rozlewy butelkowe (bottling)")
    for btid, oid, bid, name, desc, qty, bottled_at in bottlings:
        add(
            f"""INSERT INTO bottling (id, organisation_id, batch_id, name, description, quantity, bottled_at, active)
VALUES ({sql_uuid(btid)}, {sql_uuid(oid)}, {sql_uuid(bid)}, {sql_str(name)}, {sql_str(desc)}, {sql_num(qty)}, {sql_ts(bottled_at)}, TRUE)
ON CONFLICT (id) DO UPDATE SET
    batch_id = EXCLUDED.batch_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    quantity = EXCLUDED.quantity,
    bottled_at = EXCLUDED.bottled_at,
    active = EXCLUDED.active;"""
        )

    offerings = [
        (seed_uuid("offering:org1:solaris"), org1_id, bot_solaris, 69),
        (seed_uuid("offering:org1:red-reserve"), org1_id, bot_red, 119),
        (seed_uuid("offering:org1:cuvee-biale"), org1_id, bot_cuvee, 79),
        (seed_uuid("offering:org2:chardonnay"), org2_id, bot2_chard, 89),
    ]

    add("")
    add("-- 15. Publiczna oferta win (offering)")
    for ofid, oid, wine_id, price in offerings:
        add(
            f"""INSERT INTO offering (id, organisation_id, wine_id, price)
VALUES ({sql_uuid(ofid)}, {sql_uuid(oid)}, {sql_uuid(wine_id)}, {sql_num(price)})
ON CONFLICT (id) DO UPDATE SET
    wine_id = EXCLUDED.wine_id,
    price = EXCLUDED.price;"""
        )

    # =========================================================================
    # 12. ZADANIA (TASK) — wszystkie typy, ukończone, w toku, planowane i zaległe
    # =========================================================================
    tasks = [
        # Ukończone (widoczne też w raporcie Vineyard Operations)
        TaskSeed(
            key="task:1",
            org_id=org1_id,
            created_by_email="owner@winnica.pl",
            creator_role="OWNER",
            assigned_to_email="pracownik@winnica.pl",
            task_type="FIELD_WORK",
            name="Defoliacja strefy gron na kwaterze Riesling",
            description="Usunięcie liści zacieniających grona po wschodniej stronie szpaleru w celu poprawy przewietrzania.",
            field_id=f_riesling,
            started_at=d_off(-67),
            completed_at=d_off(-66),
            due_date=d_off(-65),
        ),
        TaskSeed(
            key="task:2",
            org_id=org1_id,
            created_by_email="owner@winnica.pl",
            creator_role="OWNER",
            assigned_to_email="pracownik2@winnica.pl",
            task_type="HARVEST",
            name="Zbiór ręczny winogron Johanniter do skrzynek 15 kg",
            description="Selektywny zbiór zdrowych gron o zawartości cukru pow. 21 Brix.",
            field_id=f_johanniter,
            equipment_id=eq_tractor,
            started_at=d_off(-60),
            completed_at=d_off(-60),
            due_date=d_off(-59),
        ),
        TaskSeed(
            key="task:3",
            org_id=org1_id,
            created_by_email="enolog@winnica.pl",
            creator_role="OENOLOGIST",
            assigned_to_email="enolog@winnica.pl",
            task_type="GENERAL",
            name="Kontrola parametrów końcowych fermentacji Johanniter F-101",
            description="Pomiar cukru resztkowego, pH oraz kwasowości ogólnej przed zlaniem znad osadu.",
            equipment_id=eq_ferm1,
            batch_id=b_cur_ferm,
            record_id=rec_ferm_latest,
            started_at=d_off(-12),
            completed_at=d_off(-12),
            due_date=d_off(-11),
        ),
        # Zaległe (overdue — due_date < dziś, completed_at = NULL)
        TaskSeed(
            key="task:4",
            org_id=org1_id,
            created_by_email="owner@winnica.pl",
            creator_role="OWNER",
            assigned_to_email="pracownik@winnica.pl",
            task_type="EQUIPMENT_MAINTENANCE",
            name="Przegląd techniczny i wymiana filtrów w ciągniku Antonio Carraro",
            description="Upłynął termin badania technicznego — pilny przegląd układu hamulcowego oraz hydrauliki.",
            equipment_id=eq_tractor,
            started_at=d_off(-5),
            completed_at=None,
            due_date=d_off(-3),
        ),
        TaskSeed(
            key="task:5",
            org_id=org1_id,
            created_by_email="owner@winnica.pl",
            creator_role="OWNER",
            assigned_to_email="enolog@winnica.pl",
            task_type="GENERAL",
            name="Utylizacja i protokół strat dla utlenionej partii Zweigelt",
            description="Opróżnienie i mycie alkaliczne zbiornika po zepsutej partii testowej.",
            batch_id=b_cur_spoiled,
            started_at=None,
            completed_at=None,
            due_date=d_off(-1),
        ),
        # Planowane / w toku (nadchodzące)
        TaskSeed(
            key="task:6",
            org_id=org1_id,
            created_by_email="owner@winnica.pl",
            creator_role="OWNER",
            assigned_to_email="pracownik@winnica.pl",
            task_type="SPRAYING",
            name="Wiosenno-profilaktyczny oprysk miedziowy na kwaterze Solaris",
            description="Wykonać w bezwietrzny poranek przy temperaturze powyżej 10°C.",
            field_id=f_solaris,
            equipment_id=eq_sprayer,
            substance_id=sub_miedzian,
            started_at=None,
            completed_at=None,
            due_date=d_off(4),
        ),
        TaskSeed(
            key="task:7",
            org_id=org1_id,
            created_by_email="owner@winnica.pl",
            creator_role="OWNER",
            assigned_to_email="pracownik2@winnica.pl",
            task_type="FIELD_WORK",
            name="Naciąganie drutów konstrukcji szpalerowej na kwaterze Regent",
            description="Kontrola słupków skrajnych i kotew po sezonie wietrznym.",
            field_id=f_regent,
            started_at=d_off(0),
            completed_at=None,
            due_date=d_off(6),
        ),
        TaskSeed(
            key="task:8",
            org_id=org1_id,
            created_by_email="owner@winnica.pl",
            creator_role="OWNER",
            assigned_to_email="full@winnica.pl",
            task_type="GENERAL",
            name="Dopełnienie beczek Barrique #1 (Pinot Noir)",
            description="Kontrola poziomu wina w beczce dębowej oraz wolnego SO2 (docelowo 30 mg/L).",
            equipment_id=eq_barrel1,
            batch_id=b_cur_aged,
            started_at=None,
            completed_at=None,
            due_date=d_off(7),
        ),
        TaskSeed(
            key="task:9",
            org_id=org1_id,
            created_by_email="owner@winnica.pl",
            creator_role="OWNER",
            assigned_to_email="enolog@winnica.pl",
            task_type="GENERAL",
            name="Etykietowanie dodatkowej transzy Jurajskie Czerwone Reserve",
            description="Przygotowanie 120 butelek pod zamówienia degustacyjne wraz z kodami QR.",
            equipment_id=eq_bottling,
            batch_id=b_red_bottled,
            bottling_id=bot_red,
            started_at=None,
            completed_at=None,
            due_date=d_off(10),
        ),
        TaskSeed(
            key="task:10",
            org_id=org1_id,
            created_by_email="owner@winnica.pl",
            creator_role="OWNER",
            assigned_to_email="pracownik@winnica.pl",
            task_type="EQUIPMENT_MAINTENANCE",
            name="Kalibracja dysz opryskiwacza Krukowiak Apollo przed przeglądem",
            description="Sprawdzenie równomierności wydatku cieczy roboczej i ciśnienia pompy.",
            equipment_id=eq_sprayer,
            started_at=None,
            completed_at=None,
            due_date=d_off(12),
        ),
    ]

    add("")
    add("-- 16. Zadania (task)")
    for t in tasks:
        validate_task_seed(t)
        tid = seed_uuid(t.key)
        created_by_subq = f"(SELECT id FROM _user WHERE email = {sql_str(t.created_by_email)})"
        assigned_to_subq = f"(SELECT id FROM _user WHERE email = {sql_str(t.assigned_to_email)})"
        add(
            f"""INSERT INTO task (
    id, organisation_id, created_by_id, creator_role_at_creation, assigned_to_id,
    task_type, name, description, field_id, equipment_id, substance_id,
    batch_id, bottling_id, record_id, started_at, completed_at, due_date, active
)
VALUES (
    {sql_uuid(tid)}, {sql_uuid(t.org_id)}, {created_by_subq}, {sql_str(t.creator_role)}, {assigned_to_subq},
    {sql_str(t.task_type)}, {sql_str(t.name)}, {sql_str(t.description)}, {sql_uuid(t.field_id)}, {sql_uuid(t.equipment_id)}, {sql_uuid(t.substance_id)},
    {sql_uuid(t.batch_id)}, {sql_uuid(t.bottling_id)}, {sql_uuid(t.record_id)}, {sql_date(t.started_at)}, {sql_date(t.completed_at)}, {sql_date(t.due_date)}, TRUE
)
ON CONFLICT (id) DO UPDATE SET
    assigned_to_id = EXCLUDED.assigned_to_id,
    task_type = EXCLUDED.task_type,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    field_id = EXCLUDED.field_id,
    equipment_id = EXCLUDED.equipment_id,
    substance_id = EXCLUDED.substance_id,
    batch_id = EXCLUDED.batch_id,
    bottling_id = EXCLUDED.bottling_id,
    record_id = EXCLUDED.record_id,
    started_at = EXCLUDED.started_at,
    completed_at = EXCLUDED.completed_at,
    due_date = EXCLUDED.due_date,
    active = EXCLUDED.active;"""
        )

    add("")
    add("COMMIT;")
    return "\n".join(lines) + "\n"


def is_tcp_reachable(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def execute_via_psycopg(sql: str, host: str, port: int, dbname: str, user: str, password: str) -> bool:
    for mod_name in ("psycopg", "psycopg2"):
        try:
            db_mod = __import__(mod_name)
        except ImportError:
            continue

        conn = db_mod.connect(
            host=host,
            port=port,
            dbname=dbname,
            user=user,
            password=password,
        )
        try:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
        finally:
            conn.close()
        print(f"[OK] Załadowano dane przez sterownik Python `{mod_name}` ({host}:{port}/{dbname}).")
        return True
    return False


def execute_via_psql(sql: str, host: str, port: int, dbname: str, user: str, password: str) -> bool:
    psql_bin = shutil.which("psql")
    if not psql_bin:
        return False

    env = os.environ.copy()
    env["PGPASSWORD"] = password
    cmd = [
        psql_bin,
        "-v",
        "ON_ERROR_STOP=1",
        "-h",
        host,
        "-p",
        str(port),
        "-U",
        user,
        "-d",
        dbname,
        "-q",
    ]
    res = subprocess.run(cmd, input=sql, text=True, env=env, capture_output=True)
    if res.returncode != 0:
        raise RuntimeError(f"Błąd `psql`:\n{res.stderr.strip()}")
    print(f"[OK] Załadowano dane przez lokalne `psql` ({host}:{port}/{dbname}).")
    return True


def execute_via_container(sql: str, container: str, dbname: str, user: str, password: str) -> bool:
    for runtime in ("podman", "docker"):
        runtime_bin = shutil.which(runtime)
        if not runtime_bin:
            continue

        inspect = subprocess.run(
            [runtime_bin, "inspect", "-f", "{{.State.Running}}", container],
            text=True,
            capture_output=True,
        )
        if inspect.returncode != 0 or inspect.stdout.strip().lower() != "true":
            continue

        cmd = [
            runtime_bin,
            "exec",
            "-i",
            "-e",
            f"PGPASSWORD={password}",
            container,
            "psql",
            "-v",
            "ON_ERROR_STOP=1",
            "-U",
            user,
            "-d",
            dbname,
            "-q",
        ]
        res = subprocess.run(cmd, input=sql, text=True, capture_output=True)
        if res.returncode != 0:
            raise RuntimeError(f"Błąd `{runtime} exec {container} psql`:\n{res.stderr.strip()}")
        print(f"[OK] Załadowano dane przez `{runtime} exec` w kontenerze `{container}` (baza `{dbname}`).")
        return True
    return False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Uzupełnia bazę danych PostgreSQL przykładowymi danymi winnicy i winiarni."
    )
    parser.add_argument(
        "--mode",
        choices=("auto", "container", "psycopg", "psql", "sql"),
        default="auto",
        help="Sposób wykonania (domyślnie: auto — próbuje psycopg -> psql -> podman/docker exec).",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Wyczyść istniejące dane aplikacyjne (TRUNCATE CASCADE) przed wstawieniem danych.",
    )
    parser.add_argument(
        "--host",
        default=os.environ.get("DB_HOST", "localhost"),
        help="Host bazy PostgreSQL (domyślnie: localhost).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("DB_PORT", "5432")),
        help="Port bazy PostgreSQL (domyślnie: 5432).",
    )
    parser.add_argument(
        "--dbname",
        default=os.environ.get("POSTGRES_DB", "backend"),
        help="Nazwa bazy danych (domyślnie: backend).",
    )
    parser.add_argument(
        "--user",
        default=os.environ.get("POSTGRES_USER", "admin"),
        help="Użytkownik bazy danych (domyślnie: admin).",
    )
    parser.add_argument(
        "--password",
        default=os.environ.get("POSTGRES_PASSWORD", "password"),
        help="Hasło bazy danych (domyślnie: password).",
    )
    parser.add_argument(
        "--container",
        default=os.environ.get("DB_CONTAINER", "inzynierka-psql"),
        help="Nazwa kontenera Docker/Podman z PostgreSQL (domyślnie: inzynierka-psql).",
    )
    parser.add_argument(
        "--user-password",
        default=DEFAULT_USER_PASSWORD,
        help=f"Hasło do logowania dla wygenerowanych kont w aplikacji (domyślnie: {DEFAULT_USER_PASSWORD}).",
    )
    parser.add_argument(
        "--reference-date",
        default=None,
        help="Data odniesienia YYYY-MM-DD do generowania dat względnych (domyślnie: dzisiaj).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Opcjonalna ścieżka zapisu wygenerowanego skryptu SQL do pliku.",
    )
    return parser.parse_args()


def print_summary(user_password: str) -> None:
    print("\nGotowe! Dostępne konta testowe w aplikacji:")
    print(f"  Hasło do wszystkich kont: {user_password}\n")
    print("  1. Winnica Dolina Prądnika (główna organizacja z pełnymi danymi):")
    print("     - owner@winnica.pl       [OWNER]                (pełny dostęp do wszystkich modułów i raportów)")
    print("     - enolog@winnica.pl      [OENOLOGIST]           (partie wina, pomiary laboratoryjne, zadania)")
    print("     - pracownik@winnica.pl   [WORKER]               (działki, opryski, zbiory, szkodniki, zadania)")
    print("     - pracownik2@winnica.pl  [WORKER]               (drugi pracownik polowy)")
    print("     - full@winnica.pl        [OENOLOGIST, WORKER]   (pracownik łączący role polowe i winiarskie)")
    print("     - zaproszony@winnica.pl  [PENDING]              (oczekujące zaproszenie do organizacji)")
    print("  2. Konto bez organizacji:")
    print("     - wolny@winnica.pl       [NONE]                 (do testowania tworzenia / dołączania do winnicy)")
    print("  3. Winnica Sandomierskie Wzgórza (druga winnica w publicznym katalogu /offerings):")
    print("     - owner@sandomierz-wino.pl [OWNER]")


def main() -> int:
    args = parse_args()
    ref_date = date.fromisoformat(args.reference_date) if args.reference_date else date.today()
    sql = build_seed_sql(ref_date=ref_date, user_password=args.user_password, reset=args.reset)

    if args.output:
        args.output.write_text(sql, encoding="utf-8")
        print(f"[OK] Zapisano wygenerowany skrypt SQL do pliku: {args.output}")
        if args.mode == "sql":
            return 0

    if args.mode == "sql":
        sys.stdout.write(sql)
        return 0

    try:
        if args.mode == "psycopg":
            if not execute_via_psycopg(sql, args.host, args.port, args.dbname, args.user, args.password):
                print(
                    "Błąd: Brak zainstalowanego modułu `psycopg` lub `psycopg2`.",
                    file=sys.stderr,
                )
                return 1
        elif args.mode == "psql":
            if not execute_via_psql(sql, args.host, args.port, args.dbname, args.user, args.password):
                print("Błąd: Nie znaleziono programu `psql` w PATH.", file=sys.stderr)
                return 1
        elif args.mode == "container":
            if not execute_via_container(sql, args.container, args.dbname, args.user, args.password):
                print(
                    f"Błąd: Nie znaleziono uruchomionego kontenera `{args.container}` w Podmanie ani Dockerze.",
                    file=sys.stderr,
                )
                return 1
        else:  # auto
            done = False
            if is_tcp_reachable(args.host, args.port):
                done = execute_via_psycopg(sql, args.host, args.port, args.dbname, args.user, args.password)
                if not done:
                    done = execute_via_psql(sql, args.host, args.port, args.dbname, args.user, args.password)
            if not done:
                done = execute_via_container(sql, args.container, args.dbname, args.user, args.password)
            if not done:
                print(
                    "Nie udało się automatycznie połączyć z bazą danych PostgreSQL.\n"
                    "Upewnij się, że stos jest uruchomiony (np. `podman compose up -d` lub `docker compose up -d`),\n"
                    f"kontener `{args.container}` działa, lub zapisz plik SQL poleceniem:\n"
                    "  python3 scripts/seed_db.py --mode sql --output seed.sql",
                    file=sys.stderr,
                )
                return 1
    except Exception as exc:
        print(f"Błąd podczas zasilania bazy danych:\n{exc}", file=sys.stderr)
        return 1

    print_summary(args.user_password)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
