UPDATE _user
SET membership_status = CASE invitation_status
    WHEN 'PENDING' THEN 'PENDING'
    WHEN 'ACCEPTED' THEN 'MEMBER'
    ELSE COALESCE(membership_status, 'NONE')
END
WHERE invitation_status IS NOT NULL;

ALTER TABLE _user
DROP COLUMN invitation_status;
