ALTER TABLE _user
ADD COLUMN organisation_id UUID;

ALTER TABLE _user
ADD CONSTRAINT fk_user_organisation
FOREIGN KEY (organisation_id)
REFERENCES organisation (id);