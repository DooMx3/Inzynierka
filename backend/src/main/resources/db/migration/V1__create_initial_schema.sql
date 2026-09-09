CREATE TABLE organisation (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    tax_id VARCHAR(255),
    street VARCHAR(255),
    postal_code VARCHAR(255),
    city VARCHAR(255),
    logo_path VARCHAR(255),
    motto VARCHAR(255),
    active BOOLEAN NOT NULL,
    created_at TIMESTAMP
);

CREATE TABLE role (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    description VARCHAR(255)
);

CREATE TABLE _user (
    id UUID PRIMARY KEY,
    membership_status VARCHAR(255),
    invitation_status VARCHAR(255),
    firstname VARCHAR(255),
    lastname VARCHAR(255),
    phone_number VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL
);

CREATE TABLE users_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_users_roles_user
        FOREIGN KEY (user_id) REFERENCES _user (id),
    CONSTRAINT fk_users_roles_role
        FOREIGN KEY (role_id) REFERENCES role (id)
);

CREATE UNIQUE INDEX uk_user_email ON _user (email);
CREATE UNIQUE INDEX uk_role_name ON role (name);

INSERT INTO role (id, name, description)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'OWNER', 'Owner of an organisation'),
    ('00000000-0000-0000-0000-000000000002', 'WORKER', 'Vineyard worker'),
    ('00000000-0000-0000-0000-000000000003', 'OENOLOGIST', 'Wine production specialist');
