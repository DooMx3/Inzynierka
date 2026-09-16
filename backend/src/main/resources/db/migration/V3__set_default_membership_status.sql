UPDATE _user
SET membership_status = 'NONE'
WHERE membership_status IS NULL OR BTRIM(membership_status) = '';

ALTER TABLE _user
ALTER COLUMN membership_status SET DEFAULT 'NONE';
