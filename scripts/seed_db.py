#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "psycopg[binary]>=3.1",
# ]
# ///
"""
Szybki, idempotentny seed PostgreSQL dla aplikacji winnicy.

Wstawia dwie winnice z użytkownikami, działkami, sprzętem, opryskami, zbiorami,
partiami (każdy etap), pomiarami, butelkowaniem, ofertą, składnikami i zadaniami.
Ilości są zgodne z regułami backendu: zbiór nie jest liczony dwa razy, a przepływ
między partiami nie przekracza ilości źródła.

Przykłady:
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
DEFAULT_BCRYPT_HASH = "$2a$10$zSfVkp9q//Eeo/PRp1gipOBHJi4CqsLZXssArzbyk4pz37DbXE5O2"

ORG1 = "org:dolina-pradnika"
ORG2 = "org:sandomierskie-wzgorza"
SEED_EMAILS = (
    "owner@winnica.pl",
    "enolog@winnica.pl",
    "pracownik@winnica.pl",
    "pracownik2@winnica.pl",
    "full@winnica.pl",
    "zaproszony@winnica.pl",
    "wolny@winnica.pl",
    "owner@sandomierz-wino.pl",
)


def seed_uuid(key: str) -> str:
    return str(uuid.uuid5(SEED_NAMESPACE, key))


def make_emblem_png(
    bg_rgb: tuple[int, int, int],
    border_rgb: tuple[int, int, int],
    accent_rgb: tuple[int, int, int],
    size: int = 64,
) -> bytes:
    rows: list[bytes] = []
    center = (size - 1) / 2.0
    outer_r2 = (size * 0.44) ** 2
    inner_r2 = (size * 0.38) ** 2
    grape_centers = (
        (center - 6, center - 4),
        (center + 6, center - 4),
        (center, center - 4),
        (center - 3, center + 3),
        (center + 3, center + 3),
        (center, center + 10),
    )
    grape_r2 = 4.2**2
    for y in range(size):
        row = bytearray([0])
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
                row.extend((*(accent_rgb if in_grape or in_stem else bg_rgb), 255))
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(kind: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(kind + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def sql_bool(value: bool) -> str:
    return "TRUE" if value else "FALSE"


def sql_num(value: int | float | Decimal | None) -> str:
    return "NULL" if value is None else format(value, "f") if isinstance(value, Decimal) else str(value)


def sql_uuid(value: str | None) -> str:
    return "NULL" if value is None else f"'{value}'::uuid"


def sql_date(value: date | None) -> str:
    return "NULL" if value is None else f"DATE '{value.isoformat()}'"


def sql_ts(value: datetime | None) -> str:
    return "NULL" if value is None else f"TIMESTAMP '{value.strftime('%Y-%m-%d %H:%M:%S')}'"


def sql_tstz(value: datetime | None) -> str:
    if value is None:
        return "NULL"
    utc_val = value.astimezone(timezone.utc)
    return f"TIMESTAMPTZ '{utc_val.strftime('%Y-%m-%d %H:%M:%S+00')}'"


def sql_bytea(data: bytes) -> str:
    return f"decode('{data.hex()}', 'hex')"


def u(key: str) -> str:
    return sql_uuid(seed_uuid(key))


@dataclass(frozen=True)
class TaskSeed:
    key: str
    org_id: str
    created_by: str
    creator_role: str
    assigned_to: str
    task_type: str
    name: str
    description: str
    field_id: str | None = None
    equipment_id: str | None = None
    substance_id: str | None = None
    batch_id: str | None = None
    bottling_id: str | None = None
    record_id: str | None = None
    started_at: date | None = None
    completed_at: date | None = None
    due_date: date | None = None


def validate_task(task: TaskSeed) -> None:
    if task.task_type not in {"GENERAL", "SPRAYING", "HARVEST", "FIELD_WORK", "EQUIPMENT_MAINTENANCE"}:
        raise ValueError(f"{task.key}: zły typ {task.task_type}")
    if task.task_type == "SPRAYING":
        ok = task.field_id and task.substance_id and not any((task.batch_id, task.bottling_id, task.record_id))
    elif task.task_type in {"HARVEST", "FIELD_WORK"}:
        ok = task.field_id and not any((task.substance_id, task.batch_id, task.bottling_id, task.record_id))
    elif task.task_type == "EQUIPMENT_MAINTENANCE":
        ok = task.equipment_id and not task.field_id and not any(
            (task.substance_id, task.batch_id, task.bottling_id, task.record_id)
        )
    else:
        ok = True
    if not ok:
        raise ValueError(f"{task.key}: łamie chk_task_type_relations")


def resolve_password_sql_expr(user_password: str) -> tuple[list[str], str]:
    if user_password == DEFAULT_USER_PASSWORD:
        return [], sql_str(DEFAULT_BCRYPT_HASH)
    try:
        import bcrypt  # type: ignore[import-not-found]

        hashed = bcrypt.hashpw(user_password.encode("utf-8"), bcrypt.gensalt(rounds=10, prefix=b"2a")).decode("ascii")
        return [], sql_str(hashed)
    except ImportError:
        return ["CREATE EXTENSION IF NOT EXISTS pgcrypto;"], f"crypt({sql_str(user_password)}, gen_salt('bf', 10))"


def add_insert(add, comment: str, table: str, columns: list[str], rows: list[tuple[str, ...]], conflict: str) -> None:
    if not rows:
        return
    add(f"-- {comment}")
    values = ",\n".join("    (" + ", ".join(row) + ")" for row in rows)
    add(f"INSERT INTO {table} ({', '.join(columns)})\nVALUES\n{values}\n{conflict};")
    add("")


def build_seed_sql(ref_date: date, user_password: str, reset: bool) -> str:
    lines: list[str] = []
    add = lines.append

    def dt(days: int, hour: int = 10, minute: int = 0) -> datetime:
        return datetime.combine(ref_date + timedelta(days=days), time(hour, minute), tzinfo=timezone.utc)

    def day(days: int) -> date:
        return ref_date + timedelta(days=days)

    def q(value: str | int | Decimal) -> Decimal:
        return Decimal(value)

    # key -> (stage, quantity). Harvest links and batch links are validated before SQL is emitted.
    batches: dict[str, tuple[str, Decimal]] = {}
    harvest_kg: dict[str, int] = {}
    harvest_links: list[tuple[str, str, str, Decimal]] = []  # id, harvest, batch, kg
    batch_links: list[tuple[str, str, str, Decimal]] = []  # id, source, target, qty

    def batch(key: str, stage: str, qty: Decimal) -> str:
        batches[key] = (stage, qty)
        return key

    def harvest(key: str, kg: int) -> str:
        harvest_kg[key] = kg
        return key

    def from_harvest(link_key: str, harvest_key: str, batch_key: str, qty: Decimal) -> None:
        harvest_links.append((link_key, harvest_key, batch_key, qty))

    def from_batch(link_key: str, source_key: str, target_key: str, qty: Decimal) -> None:
        batch_links.append((link_key, source_key, target_key, qty))

    f_solaris = "field:org1:solaris"
    f_johanniter = "field:org1:johanniter"
    f_riesling = "field:org1:riesling"
    f_regent = "field:org1:regent"
    f_pinot = "field:org1:pinot-noir"
    f_zweigelt = "field:org1:zweigelt"
    f2_chard = "field:org2:chardonnay"
    f2_cab = "field:org2:cabernet-cortis"

    h24_sol = harvest("harvest:2024:solaris", 3900)
    h24_reg = harvest("harvest:2024:regent", 3400)
    h25_sol = harvest("harvest:2025:solaris", 4600)
    h25_white = harvest("harvest:2025:white", 4200)
    h25_red = harvest("harvest:2025:red", 4800)
    h_sol = harvest("harvest:cur:solaris", 4450)
    h_joh = harvest("harvest:cur:johanniter", 3100)
    h_rie = harvest("harvest:cur:riesling", 2650)
    h_pin = harvest("harvest:cur:pinot", 2300)
    h_zwe = harvest("harvest:cur:zweigelt", 1450)
    h2_chard = harvest("harvest:org2:chardonnay", 3600)

    # Zabutelkowane wina mają jedno źródło zbioru (raport dni zbioru -> butelka, bez podwójnego liczenia kg).
    b_sol_bot = batch("batch:solaris-bottled", "BOTTLED", q("2200"))
    b_red_bot = batch("batch:red-bottled", "BOTTLED", q("2500"))
    b_cuv_bot = batch("batch:cuvee-bottled", "BOTTLED", q("2100"))
    b2_bot = batch("batch:org2:chardonnay-bottled", "BOTTLED", q("2400"))
    from_harvest("hb:solaris-bottled", h25_sol, b_sol_bot, q("2200"))
    from_harvest("hb:red-bottled", h25_red, b_red_bot, q("2500"))
    from_harvest("hb:cuvee-bottled", h25_white, b_cuv_bot, q("2100"))
    from_harvest("hb:org2-bottled", h2_chard, b2_bot, q("2400"))

    # Bieżący sezon: moszcz ze zbioru, dalsze etapy tylko z partii źródłowej.
    b_sol_must = batch("batch:cur:solaris-must", "MUST", q("1800"))
    b_joh_must = batch("batch:cur:johanniter-must", "MUST", q("2300"))
    b_joh_ferm = batch("batch:cur:johanniter-ferm", "FERMENTING", q("2100"))
    b_rie_must = batch("batch:cur:riesling-must", "MUST", q("1850"))
    b_pin_must = batch("batch:cur:pinot-must", "MUST", q("1700"))
    b_pin_aged = batch("batch:cur:pinot-aged", "AGED", q("1500"))
    b_zwe_must = batch("batch:cur:zweigelt-must", "MUST", q("900"))
    b_zwe_bad = batch("batch:cur:zweigelt-spoiled", "FERMENTING", q("400"))
    b_blend = batch("batch:cur:white-blend", "BLENDED", q("1500"))
    from_harvest("hb:cur-solaris", h_sol, b_sol_must, q("1800"))
    from_harvest("hb:cur-johanniter", h_joh, b_joh_must, q("2300"))
    from_harvest("hb:cur-riesling", h_rie, b_rie_must, q("1850"))
    from_harvest("hb:cur-pinot", h_pin, b_pin_must, q("1700"))
    from_harvest("hb:cur-zweigelt", h_zwe, b_zwe_must, q("900"))
    from_batch("bs:joh-ferm", b_joh_must, b_joh_ferm, q("2100"))
    from_batch("bs:pin-aged", b_pin_must, b_pin_aged, q("1500"))
    from_batch("bs:zwe-bad", b_zwe_must, b_zwe_bad, q("400"))
    from_batch("bs:blend-sol", b_sol_must, b_blend, q("700"))
    from_batch("bs:blend-joh", b_joh_ferm, b_blend, q("800"))

    taken: dict[str, Decimal] = {}
    for _, harvest_key, batch_key, qty in harvest_links:
        taken[harvest_key] = taken.get(harvest_key, Decimal(0)) + qty
        if taken[harvest_key] > harvest_kg[harvest_key]:
            raise ValueError(f"Zbiór {harvest_key} ma {harvest_kg[harvest_key]} kg, powiązano {taken[harvest_key]}")
        stage, batch_qty = batches[batch_key]
        incoming = sum((q for _, h, b, q in harvest_links if b == batch_key), Decimal(0))
        incoming += sum((q for _, _s, b, q in batch_links if b == batch_key), Decimal(0))
        if incoming != batch_qty:
            raise ValueError(f"Partia {batch_key} ({stage}) ma {batch_qty}, a źródła sumują się do {incoming}")
    outgoing: dict[str, Decimal] = {}
    for _, source_key, target_key, qty in batch_links:
        if source_key == target_key:
            raise ValueError(f"Partia {source_key} wskazuje samą siebie")
        outgoing[source_key] = outgoing.get(source_key, Decimal(0)) + qty
        if outgoing[source_key] > batches[source_key][1]:
            raise ValueError(f"Z partii {source_key} wypływa więcej niż jej ilość")
        _stage, batch_qty = batches[target_key]
        incoming = sum((q for _, h, b, q in harvest_links if b == target_key), Decimal(0))
        incoming += sum((q for _, _s, b, q in batch_links if b == target_key), Decimal(0))
        if incoming != batch_qty:
            raise ValueError(f"Partia {target_key} ma {batch_qty}, a źródła sumują się do {incoming}")

    pwd_preamble, pwd_expr = resolve_password_sql_expr(user_password)
    org_ids = f"{u(ORG1)}, {u(ORG2)}"
    emails_sql = ", ".join(sql_str(email) for email in SEED_EMAILS)

    add("-- Seed wygenerowany przez scripts/seed_db.py")
    add("BEGIN;")
    add("")
    add(
        """DO $$
BEGIN
    IF to_regclass('public.organisation') IS NULL
       OR to_regclass('public.offering') IS NULL
       OR to_regclass('public.ingredient') IS NULL
       OR to_regclass('public.batch_ingredient') IS NULL
       OR to_regclass('public.task') IS NULL THEN
        RAISE EXCEPTION 'Brak schematu aplikacji. Najpierw uruchom backend (Liquibase).';
    END IF;
END $$;"""
    )
    add("")
    for stmt in pwd_preamble:
        add(stmt)

    if reset:
        add(
            """TRUNCATE TABLE
    task,
    batch_ingredient,
    offering,
    record,
    bottling,
    batch_source,
    harvest_batch,
    batch,
    ingredient,
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
RESTART IDENTITY CASCADE;"""
        )
        add("")

    add("-- Usunięcie poprzednich danych dwóch winnic demo (zostawia obce organizacje, chyba że podano --reset)")
    add(
        f"""DELETE FROM task
WHERE organisation_id IN ({org_ids})
   OR created_by_id IN (SELECT id FROM _user WHERE email IN ({emails_sql}))
   OR assigned_to_id IN (SELECT id FROM _user WHERE email IN ({emails_sql}));
DELETE FROM batch_ingredient WHERE organisation_id IN ({org_ids});
DELETE FROM offering WHERE organisation_id IN ({org_ids});
DELETE FROM record WHERE organisation_id IN ({org_ids});
DELETE FROM bottling WHERE organisation_id IN ({org_ids});
DELETE FROM batch_source WHERE organisation_id IN ({org_ids});
DELETE FROM harvest_batch WHERE organisation_id IN ({org_ids});
DELETE FROM batch WHERE organisation_id IN ({org_ids});
DELETE FROM ingredient WHERE organisation_id IN ({org_ids});
DELETE FROM spraying WHERE organisation_id IN ({org_ids});
DELETE FROM pest_observation WHERE organisation_id IN ({org_ids});
DELETE FROM field_harvest WHERE harvest_id IN (SELECT id FROM harvest WHERE organisation_id IN ({org_ids}));
DELETE FROM harvest WHERE organisation_id IN ({org_ids});
DELETE FROM equipment WHERE organisation_id IN ({org_ids});
DELETE FROM substance WHERE organisation_id IN ({org_ids});
DELETE FROM field WHERE organisation_id IN ({org_ids});
DELETE FROM password_reset_token WHERE user_id IN (SELECT id FROM _user WHERE email IN ({emails_sql}));
DELETE FROM users_roles WHERE user_id IN (SELECT id FROM _user WHERE email IN ({emails_sql}) OR organisation_id IN ({org_ids}));
DELETE FROM _user WHERE email IN ({emails_sql}) OR organisation_id IN ({org_ids});
DELETE FROM organisation_logo WHERE organisation_id IN ({org_ids});
DELETE FROM organisation WHERE id IN ({org_ids});"""
    )
    add("")

    add_insert(
        add,
        "Organizacje",
        "organisation",
        ["id", "active", "name", "tax_id", "street", "postal_code", "city", "logo_path", "motto", "created_at"],
        [
            (
                u(ORG1),
                "TRUE",
                sql_str("Winnica Dolina Prądnika"),
                sql_str("6762581429"),
                sql_str("ul. Winnicka 14"),
                sql_str("32-043"),
                sql_str("Skała"),
                sql_str(f"/api/organisations/{seed_uuid(ORG1)}/logo"),
                sql_str("Tradycja jurajskich stoków zamknięta w każdej butelce"),
                sql_ts(dt(-720, 9)),
            ),
            (
                u(ORG2),
                "TRUE",
                sql_str("Winnica Sandomierskie Wzgórza"),
                sql_str("8641927350"),
                sql_str("ul. Królowej Jadwigi 8"),
                sql_str("27-600"),
                sql_str("Sandomierz"),
                sql_str(f"/api/organisations/{seed_uuid(ORG2)}/logo"),
                sql_str("Słońce lessowych wąwozów nad Wisłą"),
                sql_ts(dt(-540, 11, 30)),
            ),
        ],
        "ON CONFLICT (id) DO UPDATE SET active = EXCLUDED.active, name = EXCLUDED.name, tax_id = EXCLUDED.tax_id, street = EXCLUDED.street, postal_code = EXCLUDED.postal_code, city = EXCLUDED.city, logo_path = EXCLUDED.logo_path, motto = EXCLUDED.motto",
    )

    logo1 = make_emblem_png((63, 46, 34), (201, 164, 106), (164, 58, 76))
    logo2 = make_emblem_png((45, 62, 40), (212, 178, 106), (222, 196, 118))
    add_insert(
        add,
        "Logotypy",
        "organisation_logo",
        ["organisation_id", "content_type", "image_data", "file_size", "updated_at"],
        [
            (u(ORG1), sql_str("image/png"), sql_bytea(logo1), str(len(logo1)), sql_ts(dt(-30, 12))),
            (u(ORG2), sql_str("image/png"), sql_bytea(logo2), str(len(logo2)), sql_ts(dt(-30, 12))),
        ],
        "ON CONFLICT (organisation_id) DO UPDATE SET content_type = EXCLUDED.content_type, image_data = EXCLUDED.image_data, file_size = EXCLUDED.file_size, updated_at = EXCLUDED.updated_at",
    )

    users = [
        ("user:owner@winnica.pl", "owner@winnica.pl", "Jan", "Kowalski", "+48 601 234 567", "MEMBER", ORG1, ["OWNER"]),
        ("user:enolog@winnica.pl", "enolog@winnica.pl", "Anna", "Nowak", "+48 602 345 678", "MEMBER", ORG1, ["OENOLOGIST"]),
        ("user:pracownik@winnica.pl", "pracownik@winnica.pl", "Piotr", "Wiśniewski", "+48 603 456 789", "MEMBER", ORG1, ["WORKER"]),
        ("user:pracownik2@winnica.pl", "pracownik2@winnica.pl", "Katarzyna", "Wójcik", "+48 604 567 890", "MEMBER", ORG1, ["WORKER"]),
        ("user:full@winnica.pl", "full@winnica.pl", "Marek", "Zieliński", "+48 605 678 901", "MEMBER", ORG1, ["OENOLOGIST", "WORKER"]),
        ("user:zaproszony@winnica.pl", "zaproszony@winnica.pl", "Tomasz", "Kamiński", "+48 606 789 012", "PENDING", ORG1, []),
        ("user:wolny@winnica.pl", "wolny@winnica.pl", "Magdalena", "Lewandowska", "+48 607 890 123", "NONE", None, []),
        ("user:owner@sandomierz-wino.pl", "owner@sandomierz-wino.pl", "Krzysztof", "Dąbrowski", "+48 608 901 234", "MEMBER", ORG2, ["OWNER"]),
    ]
    add_insert(
        add,
        "Użytkownicy",
        "_user",
        ["id", "active", "email", "firstname", "lastname", "membership_status", "password", "phone_number", "organisation_id"],
        [
            (
                u(key),
                "TRUE",
                sql_str(email),
                sql_str(first),
                sql_str(last),
                sql_str(status),
                pwd_expr,
                sql_str(phone),
                u(org) if org else "NULL",
            )
            for key, email, first, last, phone, status, org, _roles in users
        ],
        "ON CONFLICT (id) DO UPDATE SET active = EXCLUDED.active, email = EXCLUDED.email, firstname = EXCLUDED.firstname, lastname = EXCLUDED.lastname, membership_status = EXCLUDED.membership_status, password = EXCLUDED.password, phone_number = EXCLUDED.phone_number, organisation_id = EXCLUDED.organisation_id",
    )
    add_insert(
        add,
        "Role",
        "users_roles",
        ["user_id", "role"],
        [(u(key), sql_str(role)) for key, _email, _f, _l, _p, _s, _o, roles in users for role in roles],
        "ON CONFLICT (user_id, role) DO NOTHING",
    )

    fields = [
        (f_solaris, ORG1, "SOLARIS", None, "WHITE", "145.50"),
        (f_johanniter, ORG1, "JOHANNITER", None, "WHITE", "110.00"),
        (f_riesling, ORG1, "RIESLING", None, "WHITE", "95.25"),
        (f_regent, ORG1, "REGENT", None, "RED", "130.00"),
        (f_pinot, ORG1, "PINOT_NOIR", None, "RED", "85.00"),
        (f_zweigelt, ORG1, "OTHER", "Zweigelt", "RED", "60.00"),
        (f2_chard, ORG2, "CHARDONNAY", None, "WHITE", "120.00"),
        (f2_cab, ORG2, "CABERNET_CORTIS", None, "RED", "90.00"),
    ]
    add_insert(
        add,
        "Działki",
        "field",
        ["id", "organisation_id", "grape_variety", "other_grape_variety", "grape_color", "area_are", "active"],
        [
            (u(key), u(org), sql_str(variety), sql_str(other), sql_str(color), area, "TRUE")
            for key, org, variety, other, color, area in fields
        ],
        "ON CONFLICT (id) DO UPDATE SET grape_variety = EXCLUDED.grape_variety, other_grape_variety = EXCLUDED.other_grape_variety, grape_color = EXCLUDED.grape_color, area_are = EXCLUDED.area_are, active = EXCLUDED.active",
    )

    eq_press = "eq:org1:press-1"
    eq_ferm1 = "eq:org1:fermentor-1"
    eq_ferm2 = "eq:org1:fermentor-2"
    eq_barrel1 = "eq:org1:barrel-1"
    eq_barrel2 = "eq:org1:barrel-2"
    eq_tank = "eq:org1:tank-1"
    eq_mixer = "eq:org1:mixer-1"
    eq_bottling = "eq:org1:bottling-1"
    eq_sprayer = "eq:org1:sprayer-1"
    eq_tractor = "eq:org1:tractor-1"
    eq2_ferm = "eq:org2:fermentor-1"
    eq2_bottling = "eq:org2:bottling-1"
    eq2_sprayer = "eq:org2:sprayer-1"
    equipment = [
        (eq_press, ORG1, "Prasa pneumatyczna Bucher XPlus 22", "Press", 240),
        (eq_ferm1, ORG1, "Fermentor stalowy F-101 (2000 L)", "Fermentor", 185),
        (eq_ferm2, ORG1, "Fermentor stalowy F-102 (1500 L)", "Fermentor", 21),
        (eq_barrel1, ORG1, "Beczka dębowa francuska Barrique #1", "Barrel", None),
        (eq_barrel2, ORG1, "Beczka dębowa węgierska #2", "Barrel", None),
        (eq_tank, ORG1, "Zbiornik leżakowy Inox T-301", "Tank", 310),
        (eq_mixer, ORG1, "Mieszalnik kupażowy M-10", "Mixer", 150),
        (eq_bottling, ORG1, "Linia rozlewnicza GAI 1205", "Bottling line", 95),
        (eq_sprayer, ORG1, "Opryskiwacz sadowniczy Krukowiak Apollo", "Sprayer", 14),
        (eq_tractor, ORG1, "Ciągnik winniczy Antonio Carraro TTR 4400", "Tractor", -9),
        (eq2_ferm, ORG2, "Fermentor Inox S-01 (1200 L)", "Fermentor", 200),
        (eq2_bottling, ORG2, "Linia rozlewnicza Enolmaster", "Bottling line", 160),
        (eq2_sprayer, ORG2, "Opryskiwacz zawieszany Bury Wulkan", "Sprayer", 120),
    ]
    add_insert(
        add,
        "Sprzęt",
        "equipment",
        ["id", "organisation_id", "name", "type", "end_of_technical_inspection", "active"],
        [
            (u(key), u(org), sql_str(name), sql_str(kind), sql_date(None if inspection is None else day(inspection)), "TRUE")
            for key, org, name, kind, inspection in equipment
        ],
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, end_of_technical_inspection = EXCLUDED.end_of_technical_inspection, active = EXCLUDED.active",
    )

    sub_siarkol = "sub:org1:siarkol"
    sub_miedzian = "sub:org1:miedzian"
    sub_switch = "sub:org1:switch"
    sub_topas = "sub:org1:topas"
    sub_ridomil = "sub:org1:ridomil"
    sub2_siarkol = "sub:org2:siarkol"
    substances = [
        (sub_siarkol, ORG1, "Siarkol Extra 80 WP"),
        (sub_miedzian, ORG1, "Miedzian 50 WP"),
        (sub_switch, ORG1, "Switch 62.5 WG"),
        (sub_topas, ORG1, "Topas 100 EC"),
        (sub_ridomil, ORG1, "Ridomil Gold MZ Pepite 67.8 WG"),
        (sub2_siarkol, ORG2, "Siarkol Extra 80 WP"),
    ]
    add_insert(
        add,
        "Środki ochrony",
        "substance",
        ["id", "organisation_id", "name", "active"],
        [(u(key), u(org), sql_str(name), "TRUE") for key, org, name in substances],
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active",
    )

    pests = [
        ("pest:1", ORG1, f_solaris, "DISEASE", "Mączniak prawdziwy winorośli", -165, "Biały nalot na liściach w rzędach 4-8."),
        ("pest:2", ORG1, f_regent, "DISEASE", "Mączniak rzekomy winorośli", -130, "Plamy olejowe po deszczu na południowej ekspozycji."),
        ("pest:3", ORG1, f_johanniter, "PEST", "Szpeciel pilśniowiec winoroślowy", -110, "Deformacje blaszki na młodych pędach brzegowych."),
        ("pest:4", ORG1, f_riesling, "DISEASE", "Szara pleśń (Botrytis cinerea)", -68, "Ogniska w zwartych gronach przed zbiorem."),
        ("pest:5", ORG1, f_pinot, "PEST", "Zwójka kwasigroneczka", -45, "14 odłowionych osobników w pułapkach feromonowych."),
        ("pest:6", ORG1, f_zweigelt, "PEST", "Skoczek winoroślowy", -18, "Żerowanie na dolnych liściach, poniżej progu szkodliwości."),
    ]
    add_insert(
        add,
        "Obserwacje chorób i szkodników",
        "pest_observation",
        ["id", "organisation_id", "field_id", "type", "name", "observed_at", "description", "active"],
        [
            (u(key), u(org), u(field), sql_str(kind), sql_str(name), sql_date(day(when)), sql_str(desc), "TRUE")
            for key, org, field, kind, name, when, desc in pests
        ],
        "ON CONFLICT (id) DO UPDATE SET field_id = EXCLUDED.field_id, type = EXCLUDED.type, name = EXCLUDED.name, observed_at = EXCLUDED.observed_at, description = EXCLUDED.description, active = EXCLUDED.active",
    )

    # spraying_date NULL = oprysk zaplanowany (tak zapisuje frontend). due może być puste.
    sprayings = [
        ("spray:1", ORG1, f_solaris, eq_sprayer, sub_miedzian, dt(-175, 7, 30), 4, dt(-161, 7, 30)),
        ("spray:2", ORG1, f_solaris, eq_sprayer, sub_siarkol, dt(-160, 8), 6, dt(-146, 8)),
        ("spray:3", ORG1, f_regent, eq_sprayer, sub_ridomil, dt(-128, 6, 45), 3, dt(-100, 6, 45)),
        ("spray:4", ORG1, f_johanniter, eq_sprayer, sub_topas, dt(-95, 7, 15), 2, dt(-74, 7, 15)),
        ("spray:5", ORG1, f_riesling, eq_sprayer, sub_switch, dt(-65, 8, 30), 3, dt(-44, 8, 30)),
        ("spray:6", ORG1, f_pinot, eq_sprayer, sub_switch, dt(-52, 7), 2, dt(-31, 7)),
        ("spray:plan-1", ORG1, f_solaris, eq_sprayer, sub_miedzian, None, 4, dt(4, 7, 30)),
        ("spray:plan-2", ORG1, f_regent, eq_sprayer, sub_siarkol, None, 5, dt(9, 8)),
        ("spray:plan-overdue", ORG1, f_zweigelt, eq_sprayer, sub_topas, None, 2, dt(-2, 7)),
        ("spray:org2-1", ORG2, f2_chard, eq2_sprayer, sub2_siarkol, dt(-80, 8), 4, dt(-60, 8)),
    ]
    add_insert(
        add,
        "Opryski (wykonane mają datę, planowane mają spraying_date = NULL)",
        "spraying",
        ["id", "organisation_id", "field_id", "equipment_id", "substance_id", "spraying_date", "quantity", "due"],
        [
            (u(key), u(org), u(field), u(equip), u(sub), sql_tstz(when), str(qty), sql_tstz(due))
            for key, org, field, equip, sub, when, qty, due in sprayings
        ],
        "ON CONFLICT (id) DO UPDATE SET field_id = EXCLUDED.field_id, equipment_id = EXCLUDED.equipment_id, substance_id = EXCLUDED.substance_id, spraying_date = EXCLUDED.spraying_date, quantity = EXCLUDED.quantity, due = EXCLUDED.due",
    )

    harvest_rows = [
        (h24_sol, ORG1, -760, [f_solaris]),
        (h24_reg, ORG1, -735, [f_regent]),
        (h25_sol, ORG1, -410, [f_solaris]),
        (h25_white, ORG1, -395, [f_johanniter, f_riesling]),
        (h25_red, ORG1, -380, [f_regent, f_pinot]),
        (h_sol, ORG1, -75, [f_solaris]),
        (h_joh, ORG1, -60, [f_johanniter]),
        (h_rie, ORG1, -42, [f_riesling]),
        (h_pin, ORG1, -50, [f_pinot]),
        (h_zwe, ORG1, -35, [f_zweigelt]),
        (h2_chard, ORG2, -390, [f2_chard]),
    ]
    add_insert(
        add,
        "Zbiory",
        "harvest",
        ["id", "organisation_id", "harvest_date", "amount_kg", "active"],
        [
            (u(key), u(org), sql_date(day(when)), str(harvest_kg[key]), "TRUE")
            for key, org, when, _fields in harvest_rows
        ],
        "ON CONFLICT (id) DO UPDATE SET harvest_date = EXCLUDED.harvest_date, amount_kg = EXCLUDED.amount_kg, active = EXCLUDED.active",
    )
    add_insert(
        add,
        "Działki zbiorów",
        "field_harvest",
        ["field_id", "harvest_id"],
        [(u(field), u(key)) for key, _org, _when, fields in harvest_rows for field in fields],
        "ON CONFLICT (field_id, harvest_id) DO NOTHING",
    )

    batch_meta = {
        b_sol_bot: (ORG1, "Solaris Skała Klasyczne", False, -200),
        b_red_bot: (ORG1, "Jurajskie Czerwone Reserve Barrique", False, -140),
        b_cuv_bot: (ORG1, "Dolina Prądnika Cuvée Białe", False, -170),
        b2_bot: (ORG2, "Sandomierskie Chardonnay Sur Lie", False, -180),
        b_sol_must: (ORG1, "Solaris tłoczenie bieżące", False, -74),
        b_joh_must: (ORG1, "Johanniter moszcz", False, -59),
        b_joh_ferm: (ORG1, "Johanniter fermentacja F-101", False, -55),
        b_rie_must: (ORG1, "Riesling tłoczenie delikatne", False, -41),
        b_pin_must: (ORG1, "Pinot Noir moszcz", False, -49),
        b_pin_aged: (ORG1, "Pinot Noir barrique #1", False, -40),
        b_zwe_must: (ORG1, "Zweigelt moszcz", False, -34),
        b_zwe_bad: (ORG1, "Zweigelt utleniony", True, -30),
        b_blend: (ORG1, "Solaris i Johanniter kupaż młody", False, -20),
    }
    add_insert(
        add,
        "Partie",
        "batch",
        ["id", "organisation_id", "name", "stage", "quantity", "is_spoiled", "deleted", "created_at"],
        [
            (
                u(key),
                u(batch_meta[key][0]),
                sql_str(batch_meta[key][1]),
                sql_str(stage),
                sql_num(qty),
                sql_bool(batch_meta[key][2]),
                "FALSE",
                sql_ts(dt(batch_meta[key][3], 11)),
            )
            for key, (stage, qty) in batches.items()
        ],
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, stage = EXCLUDED.stage, quantity = EXCLUDED.quantity, is_spoiled = EXCLUDED.is_spoiled, deleted = EXCLUDED.deleted, created_at = EXCLUDED.created_at",
    )
    harvest_org = {key: org for key, org, _when, _fields in harvest_rows}
    add_insert(
        add,
        "Zbiór -> partia (kg, nie więcej niż amount_kg zbioru)",
        "harvest_batch",
        ["id", "organisation_id", "harvest_id", "batch_id", "quantity"],
        [
            (u(link), u(harvest_org[harvest_key]), u(harvest_key), u(batch_key), sql_num(qty))
            for link, harvest_key, batch_key, qty in harvest_links
        ],
        "ON CONFLICT (id) DO UPDATE SET harvest_id = EXCLUDED.harvest_id, batch_id = EXCLUDED.batch_id, quantity = EXCLUDED.quantity",
    )
    add_insert(
        add,
        "Partia -> partia",
        "batch_source",
        ["id", "organisation_id", "source_batch_id", "target_batch_id", "quantity"],
        [
            (u(link), u(batch_meta[source][0]), u(source), u(target), sql_num(qty))
            for link, source, target, qty in batch_links
        ],
        "ON CONFLICT (source_batch_id, target_batch_id) DO UPDATE SET quantity = EXCLUDED.quantity, organisation_id = EXCLUDED.organisation_id",
    )

    # Wartości odżywcze na 100 g. Dodatki technologiczne bez makroskładników mają zera.
    ingredients = [
        ("ing:yeast", ORG1, 1, "Drożdże Saccharomyces EC-1118", "325.00", "7.61", "1.00", "41.22", "0.00", "40.44", "0.05", "26.90"),
        ("ing:dap", ORG1, 2, "Pożywka — fosforan diamonu", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"),
        ("ing:so2", ORG1, 3, "Pirosiarczyn potasu", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"),
        ("ing:bentonite", ORG1, 4, "Bentonit", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"),
        ("ing:sugar", ORG1, 5, "Sacharoza", "400.00", "0.00", "0.00", "99.80", "99.80", "0.00", "0.01", "0.00"),
        ("ing:tartaric", ORG1, 6, "Kwas L-winowy", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"),
        ("ing:tannin", ORG1, 7, "Tanina dębowa", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"),
        ("ing:ascorbic", ORG1, 8, "Kwas askorbinowy", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"),
        ("ing:org2:yeast", ORG2, 9, "Drożdże QA23", "310.00", "6.50", "0.80", "38.00", "0.00", "42.00", "0.04", "20.00"),
        ("ing:org2:so2", ORG2, 10, "Pirosiarczyn potasu", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"),
    ]
    add_insert(
        add,
        "Katalog składników",
        "ingredient",
        [
            "id",
            "ingredient_number",
            "name",
            "energy_content",
            "fat",
            "saturated_fatty_acids",
            "carbs",
            "sugars",
            "protein",
            "salt",
            "fibers",
            "active",
            "organisation_id",
        ],
        [
            (
                u(key),
                str(number),
                sql_str(name),
                energy,
                fat,
                sat,
                carbs,
                sugars,
                protein,
                salt,
                fibers,
                "TRUE",
                u(org),
            )
            for key, org, number, name, energy, fat, sat, carbs, sugars, protein, salt, fibers in ingredients
        ],
        "ON CONFLICT (id) DO UPDATE SET ingredient_number = EXCLUDED.ingredient_number, name = EXCLUDED.name, energy_content = EXCLUDED.energy_content, fat = EXCLUDED.fat, saturated_fatty_acids = EXCLUDED.saturated_fatty_acids, carbs = EXCLUDED.carbs, sugars = EXCLUDED.sugars, protein = EXCLUDED.protein, salt = EXCLUDED.salt, fibers = EXCLUDED.fibers, active = EXCLUDED.active",
    )
    batch_ingredients = [
        ("bi:ferm-yeast", ORG1, b_joh_ferm, "ing:yeast", "250.00"),
        ("bi:ferm-dap", ORG1, b_joh_ferm, "ing:dap", "120.00"),
        ("bi:ferm-so2", ORG1, b_joh_ferm, "ing:so2", "35.00"),
        ("bi:rie-so2", ORG1, b_rie_must, "ing:so2", "20.00"),
        ("bi:rie-ascorbic", ORG1, b_rie_must, "ing:ascorbic", "15.00"),
        ("bi:pin-tannin", ORG1, b_pin_aged, "ing:tannin", "60.00"),
        ("bi:pin-so2", ORG1, b_pin_aged, "ing:so2", "25.00"),
        ("bi:blend-so2", ORG1, b_blend, "ing:so2", "30.00"),
        ("bi:bad-yeast", ORG1, b_zwe_bad, "ing:yeast", "80.00"),
        ("bi:sol-so2", ORG1, b_sol_bot, "ing:so2", "40.00"),
        ("bi:red-tannin", ORG1, b_red_bot, "ing:tannin", "45.00"),
        ("bi:cuv-sugar", ORG1, b_cuv_bot, "ing:sugar", "800.00"),
        ("bi:cuv-so2", ORG1, b_cuv_bot, "ing:so2", "35.00"),
        ("bi:org2-so2", ORG2, b2_bot, "ing:org2:so2", "50.00"),
    ]
    add_insert(
        add,
        "Składniki dodane do partii (gramy)",
        "batch_ingredient",
        ["id", "organisation_id", "batch_id", "ingredient_id", "quantity_grams"],
        [(u(key), u(org), u(batch_key), u(ing), grams) for key, org, batch_key, ing, grams in batch_ingredients],
        "ON CONFLICT (id) DO UPDATE SET batch_id = EXCLUDED.batch_id, ingredient_id = EXCLUDED.ingredient_id, quantity_grams = EXCLUDED.quantity_grams",
    )
    add("SELECT setval('ingredient_number_seq', (SELECT COALESCE(MAX(ingredient_number), 1) FROM ingredient));")
    add("")

    rec_ferm = "rec:ferm-4"
    records = [
        ("rec:ferm-1", ORG1, b_joh_ferm, "224.00", "7.40", "3.22", "15.50", "0.00", dt(-54, 9)),
        ("rec:ferm-2", ORG1, b_joh_ferm, "148.50", "7.10", "3.26", "16.80", "4.40", dt(-48, 9)),
        ("rec:ferm-3", ORG1, b_joh_ferm, "54.20", "6.85", "3.29", "16.20", "9.60", dt(-36, 9)),
        (rec_ferm, ORG1, b_joh_ferm, "6.80", "6.60", "3.31", "14.90", "12.40", dt(-12, 9)),
        ("rec:rie", ORG1, b_rie_must, "212.00", "8.30", "3.12", "12.40", "0.00", dt(-40, 17)),
        ("rec:pin", ORG1, b_pin_aged, "2.10", "5.60", "3.58", "13.20", "13.10", dt(-15, 11)),
        ("rec:blend", ORG1, b_blend, "4.50", "6.40", "3.28", "12.80", "12.60", dt(-8, 10, 30)),
        ("rec:bad", ORG1, b_zwe_bad, "18.40", "9.80", "3.84", "24.50", "10.20", dt(-25, 14)),
        ("rec:sol", ORG1, b_sol_bot, "3.20", "6.50", "3.24", "12.00", "12.80", dt(-198, 10)),
        ("rec:red", ORG1, b_red_bot, "2.40", "5.40", "3.62", "14.00", "13.50", dt(-138, 10)),
        ("rec:cuv", ORG1, b_cuv_bot, "9.80", "6.90", "3.21", "11.80", "11.90", dt(-168, 10)),
        ("rec:org2", ORG2, b2_bot, "2.80", "6.10", "3.36", "12.50", "13.00", dt(-178, 11)),
    ]
    add_insert(
        add,
        "Pomiary",
        "record",
        ["id", "organisation_id", "batch_id", "sugar_level", "acidity", "ph", "temperature", "alcohol_content", "recorded_at", "active"],
        [
            (u(key), u(org), u(batch_key), sugar, acid, ph, temp, abv, sql_tstz(when), "TRUE")
            for key, org, batch_key, sugar, acid, ph, temp, abv, when in records
        ],
        "ON CONFLICT (id) DO UPDATE SET batch_id = EXCLUDED.batch_id, sugar_level = EXCLUDED.sugar_level, acidity = EXCLUDED.acidity, ph = EXCLUDED.ph, temperature = EXCLUDED.temperature, alcohol_content = EXCLUDED.alcohol_content, recorded_at = EXCLUDED.recorded_at, active = EXCLUDED.active",
    )

    bot_sol = "bottling:solaris"
    bot_red = "bottling:red"
    bot_cuv = "bottling:cuvee"
    bot2 = "bottling:org2"
    bottlings = [
        (bot_sol, ORG1, b_sol_bot, "Solaris Skała Klasyczne", "Wytrawne białe. Gruszka, brzoskwinia i kwiat czarnego bzu.", "2200.00", dt(-198, 13)),
        (bot_red, ORG1, b_red_bot, "Jurajskie Czerwone Reserve Barrique", "Regent i Pinot Noir, wiśnia, gorzka czekolada i wanilia.", "2500.00", dt(-138, 14)),
        (bot_cuv, ORG1, b_cuv_bot, "Dolina Prądnika Cuvée Białe", "Johanniter i Riesling, cytrusy, zielone jabłko, lekki miód.", "2100.00", dt(-168, 11, 30)),
        (bot2, ORG2, b2_bot, "Sandomierskie Chardonnay Sur Lie", "Chardonnay na osadzie, pieczone jabłko i brioszka.", "2400.00", dt(-178, 12)),
    ]
    add_insert(
        add,
        "Butelkowanie",
        "bottling",
        ["id", "organisation_id", "batch_id", "name", "description", "quantity", "bottled_at", "active"],
        [
            (u(key), u(org), u(batch_key), sql_str(name), sql_str(desc), qty, sql_ts(when), "TRUE")
            for key, org, batch_key, name, desc, qty, when in bottlings
        ],
        "ON CONFLICT (id) DO UPDATE SET batch_id = EXCLUDED.batch_id, name = EXCLUDED.name, description = EXCLUDED.description, quantity = EXCLUDED.quantity, bottled_at = EXCLUDED.bottled_at, active = EXCLUDED.active",
    )
    add_insert(
        add,
        "Oferta",
        "offering",
        ["id", "organisation_id", "wine_id", "price"],
        [
            (u("offering:solaris"), u(ORG1), u(bot_sol), "69"),
            (u("offering:red"), u(ORG1), u(bot_red), "119"),
            (u("offering:cuvee"), u(ORG1), u(bot_cuv), "79"),
            (u("offering:org2"), u(ORG2), u(bot2), "89"),
        ],
        "ON CONFLICT (id) DO UPDATE SET wine_id = EXCLUDED.wine_id, price = EXCLUDED.price",
    )

    owner = "user:owner@winnica.pl"
    enolog = "user:enolog@winnica.pl"
    worker = "user:pracownik@winnica.pl"
    worker2 = "user:pracownik2@winnica.pl"
    full = "user:full@winnica.pl"
    tasks = [
        TaskSeed("task:1", ORG1, owner, "OWNER", worker, "FIELD_WORK", "Defoliacja strefy gron na Rieslingu", "Usunięcie liści zacieniających grona po wschodniej stronie szpaleru.", f_riesling, started_at=day(-67), completed_at=day(-66), due_date=day(-65)),
        TaskSeed("task:2", ORG1, owner, "OWNER", worker2, "HARVEST", "Zbiór ręczny Johanniter", "Selekcja zdrowych gron powyżej 21 Brix.", f_johanniter, eq_tractor, started_at=day(-60), completed_at=day(-60), due_date=day(-59)),
        TaskSeed("task:3", ORG1, enolog, "OENOLOGIST", enolog, "GENERAL", "Kontrola końca fermentacji Johanniter F-101", "Cukier resztkowy, pH i kwasowość przed zlaniem znad osadu.", equipment_id=eq_ferm1, batch_id=b_joh_ferm, record_id=rec_ferm, started_at=day(-12), completed_at=day(-12), due_date=day(-11)),
        TaskSeed("task:4", ORG1, owner, "OWNER", worker, "EQUIPMENT_MAINTENANCE", "Przegląd ciągnika Antonio Carraro", "Minął termin badania. Hamulce i hydraulika.", equipment_id=eq_tractor, started_at=day(-5), due_date=day(-3)),
        TaskSeed("task:5", ORG1, owner, "OWNER", enolog, "GENERAL", "Protokół strat dla utlenionego Zweigelta", "Opróżnienie i mycie zbiornika.", batch_id=b_zwe_bad, due_date=day(-1)),
        TaskSeed("task:6", ORG1, owner, "OWNER", worker, "SPRAYING", "Oprysk miedziowy na Solaris", "Bezwietrzny poranek, powyżej 10°C.", f_solaris, eq_sprayer, sub_miedzian, due_date=day(4)),
        TaskSeed("task:7", ORG1, owner, "OWNER", worker2, "FIELD_WORK", "Naciąganie drutów na Regent", "Kontrola słupków skrajnych i kotew.", f_regent, started_at=day(0), due_date=day(6)),
        TaskSeed("task:8", ORG1, owner, "OWNER", full, "GENERAL", "Dopełnienie beczki Barrique #1", "Poziom wina i wolne SO2, cel 30 mg/L.", equipment_id=eq_barrel1, batch_id=b_pin_aged, due_date=day(7)),
        TaskSeed("task:9", ORG1, owner, "OWNER", enolog, "GENERAL", "Etykietowanie Jurajskiego Czerwonego", "120 butelek pod zamówienia degustacyjne.", equipment_id=eq_bottling, batch_id=b_red_bot, bottling_id=bot_red, due_date=day(10)),
        TaskSeed("task:10", ORG1, owner, "OWNER", worker, "EQUIPMENT_MAINTENANCE", "Kalibracja dysz opryskiwacza", "Wydatek cieczy i ciśnienie pompy.", equipment_id=eq_sprayer, due_date=day(12)),
    ]
    for task in tasks:
        validate_task(task)
    add_insert(
        add,
        "Zadania",
        "task",
        [
            "id",
            "organisation_id",
            "created_by_id",
            "creator_role_at_creation",
            "assigned_to_id",
            "task_type",
            "name",
            "description",
            "field_id",
            "equipment_id",
            "substance_id",
            "batch_id",
            "bottling_id",
            "record_id",
            "started_at",
            "completed_at",
            "due_date",
            "active",
        ],
        [
            (
                u(task.key),
                u(task.org_id),
                u(task.created_by),
                sql_str(task.creator_role),
                u(task.assigned_to),
                sql_str(task.task_type),
                sql_str(task.name),
                sql_str(task.description),
                u(task.field_id) if task.field_id else "NULL",
                u(task.equipment_id) if task.equipment_id else "NULL",
                u(task.substance_id) if task.substance_id else "NULL",
                u(task.batch_id) if task.batch_id else "NULL",
                u(task.bottling_id) if task.bottling_id else "NULL",
                u(task.record_id) if task.record_id else "NULL",
                sql_date(task.started_at),
                sql_date(task.completed_at),
                sql_date(task.due_date),
                "TRUE",
            )
            for task in tasks
        ],
        "ON CONFLICT (id) DO UPDATE SET assigned_to_id = EXCLUDED.assigned_to_id, task_type = EXCLUDED.task_type, name = EXCLUDED.name, description = EXCLUDED.description, field_id = EXCLUDED.field_id, equipment_id = EXCLUDED.equipment_id, substance_id = EXCLUDED.substance_id, batch_id = EXCLUDED.batch_id, bottling_id = EXCLUDED.bottling_id, record_id = EXCLUDED.record_id, started_at = EXCLUDED.started_at, completed_at = EXCLUDED.completed_at, due_date = EXCLUDED.due_date, active = EXCLUDED.active",
    )

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
        conn = db_mod.connect(host=host, port=port, dbname=dbname, user=user, password=password)
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
    res = subprocess.run(
        [psql_bin, "-v", "ON_ERROR_STOP=1", "-h", host, "-p", str(port), "-U", user, "-d", dbname, "-q"],
        input=sql,
        text=True,
        env=env,
        capture_output=True,
    )
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
        res = subprocess.run(
            [runtime_bin, "exec", "-i", "-e", f"PGPASSWORD={password}", container, "psql", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", dbname, "-q"],
            input=sql,
            text=True,
            capture_output=True,
        )
        if res.returncode != 0:
            raise RuntimeError(f"Błąd `{runtime} exec {container} psql`:\n{res.stderr.strip()}")
        print(f"[OK] Załadowano dane przez `{runtime} exec` w kontenerze `{container}` (baza `{dbname}`).")
        return True
    return False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Uzupełnia bazę PostgreSQL przykładowymi danymi winnicy.")
    parser.add_argument("--mode", choices=("auto", "container", "psycopg", "psql", "sql"), default="auto")
    parser.add_argument("--reset", action="store_true", help="TRUNCATE wszystkich danych aplikacji przed seedem.")
    parser.add_argument("--host", default=os.environ.get("DB_HOST", "localhost"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("DB_PORT", "5432")))
    parser.add_argument("--dbname", default=os.environ.get("POSTGRES_DB", "backend"))
    parser.add_argument("--user", default=os.environ.get("POSTGRES_USER", "admin"))
    parser.add_argument("--password", default=os.environ.get("POSTGRES_PASSWORD", "password"))
    parser.add_argument("--container", default=os.environ.get("DB_CONTAINER", "inzynierka-psql"))
    parser.add_argument("--user-password", default=DEFAULT_USER_PASSWORD)
    parser.add_argument("--reference-date", default=None, help="Data odniesienia YYYY-MM-DD (domyślnie dzisiaj).")
    parser.add_argument("--output", type=Path, default=None)
    return parser.parse_args()


def print_summary(user_password: str) -> None:
    print("\nGotowe. Konta testowe:")
    print(f"  Hasło do wszystkich kont: {user_password}\n")
    print("  Winnica Dolina Prądnika:")
    print("    owner@winnica.pl        OWNER")
    print("    enolog@winnica.pl       OENOLOGIST")
    print("    pracownik@winnica.pl    WORKER")
    print("    pracownik2@winnica.pl   WORKER")
    print("    full@winnica.pl         OENOLOGIST + WORKER")
    print("    zaproszony@winnica.pl   PENDING")
    print("  Bez organizacji:")
    print("    wolny@winnica.pl        NONE")
    print("  Winnica Sandomierskie Wzgórza:")
    print("    owner@sandomierz-wino.pl OWNER")


def main() -> int:
    args = parse_args()
    ref_date = date.fromisoformat(args.reference_date) if args.reference_date else date.today()
    sql = build_seed_sql(ref_date=ref_date, user_password=args.user_password, reset=args.reset)

    if args.output:
        args.output.write_text(sql, encoding="utf-8")
        print(f"[OK] Zapisano SQL: {args.output}")
        if args.mode == "sql":
            return 0
    if args.mode == "sql":
        sys.stdout.write(sql)
        return 0

    try:
        if args.mode == "psycopg":
            ok = execute_via_psycopg(sql, args.host, args.port, args.dbname, args.user, args.password)
            if not ok:
                print("Brak modułu psycopg/psycopg2.", file=sys.stderr)
                return 1
        elif args.mode == "psql":
            if not execute_via_psql(sql, args.host, args.port, args.dbname, args.user, args.password):
                print("Brak psql w PATH.", file=sys.stderr)
                return 1
        elif args.mode == "container":
            if not execute_via_container(sql, args.container, args.dbname, args.user, args.password):
                print(f"Kontener `{args.container}` nie działa.", file=sys.stderr)
                return 1
        else:
            done = False
            if is_tcp_reachable(args.host, args.port):
                done = execute_via_psycopg(sql, args.host, args.port, args.dbname, args.user, args.password)
                if not done:
                    done = execute_via_psql(sql, args.host, args.port, args.dbname, args.user, args.password)
            if not done:
                done = execute_via_container(sql, args.container, args.dbname, args.user, args.password)
            if not done:
                print(
                    "Nie udało się połączyć z PostgreSQL.\n"
                    "Uruchom stos (`podman compose up -d` albo `docker compose up -d`)\n"
                    "albo zapisz SQL: python3 scripts/seed_db.py --mode sql --output seed.sql",
                    file=sys.stderr,
                )
                return 1
    except Exception as exc:
        print(f"Błąd podczas zasilania bazy:\n{exc}", file=sys.stderr)
        return 1

    print_summary(args.user_password)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
