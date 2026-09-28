CREATE TABLE password_reset_token (
                                      id UUID PRIMARY KEY,
                                      token_hash VARCHAR(255) NOT NULL UNIQUE,
                                      user_id UUID NOT NULL,
                                      expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
                                      used BOOLEAN NOT NULL DEFAULT FALSE,

                                      CONSTRAINT fk_password_reset_token_user
                                          FOREIGN KEY (user_id)
                                              REFERENCES _user (id)
                                              ON DELETE CASCADE
);
