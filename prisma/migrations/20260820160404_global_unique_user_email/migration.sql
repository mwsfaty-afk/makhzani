-- User.email becomes globally unique (login is by email alone, no tenant selector)
DROP INDEX "User_companyId_email_key";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
