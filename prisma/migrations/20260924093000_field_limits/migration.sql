-- Length limits, numeric floors/ratings and format rules for every text field.
-- The same limits live in src/lib/limits.ts (validation and form inputs).

-- 1) Bring existing rows in line with the new rules -------------------------

-- Phones become digits only (+66 → 0); anything that still isn't a Thai number
-- (e.g. a "-" placeholder) is cleared.
UPDATE "User" SET "phone" = regexp_replace(regexp_replace(btrim("phone"), '^\+66', '0'), '[^0-9]', '', 'g')
WHERE "phone" IS NOT NULL;
UPDATE "User" SET "phone" = NULL WHERE "phone" !~ '^0[0-9]{8,9}$';

-- Placeholders such as "-" mean "none".
UPDATE "User" SET "department" = NULL WHERE char_length(btrim("department")) < 2;
UPDATE "User" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));
UPDATE "Building" SET "code" = NULLIF(upper(btrim("code")), '') WHERE "code" IS NOT NULL;
UPDATE "Building" SET "code" = NULL WHERE "code" !~ '^[A-Z0-9-]{1,10}$';
UPDATE "RepairRequest" SET "assetNumber" = NULL WHERE char_length(btrim("assetNumber")) < 2;
UPDATE "RepairRequest" SET "feedback" = NULL WHERE btrim("feedback") = '';
UPDATE "QrTag" SET "assetNumber" = NULL WHERE char_length(btrim("assetNumber")) < 2;
UPDATE "QrTag" SET "equipment" = NULL WHERE char_length(btrim("equipment")) < 2;
UPDATE "RequestActivity" SET "message" = NULL WHERE btrim("message") = '';

-- 2) Column types ------------------------------------------------------------

ALTER TABLE "User"
  ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
  ALTER COLUMN "email" SET DATA TYPE VARCHAR(254),
  ALTER COLUMN "passwordHash" SET DATA TYPE VARCHAR(100),
  ALTER COLUMN "phone" SET DATA TYPE VARCHAR(10),
  ALTER COLUMN "department" SET DATA TYPE VARCHAR(100);

ALTER TABLE "Building"
  ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
  ALTER COLUMN "code" SET DATA TYPE VARCHAR(10);

ALTER TABLE "Category" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100);

-- Floors were free text: keep whole numbers, map "G" → 0 and "B1".."B5" → -1..-5.
ALTER TABLE "QrTag"
  ALTER COLUMN "equipment" SET DATA TYPE VARCHAR(150),
  ALTER COLUMN "assetNumber" SET DATA TYPE VARCHAR(50),
  ALTER COLUMN "location" SET DATA TYPE VARCHAR(150),
  ALTER COLUMN "floor" SET DATA TYPE SMALLINT USING (
    CASE
      WHEN btrim("floor") ~ '^[0-9]{1,2}$' THEN btrim("floor")::smallint
      WHEN btrim("floor") ~ '^-[1-5]$' THEN btrim("floor")::smallint
      WHEN upper(btrim("floor")) ~ '^B[1-5]$' THEN -(substring(upper(btrim("floor")) FROM 2)::smallint)
      WHEN upper(btrim("floor")) = 'G' THEN 0
    END
  );

ALTER TABLE "RepairRequest"
  ALTER COLUMN "code" SET DATA TYPE VARCHAR(20),
  ALTER COLUMN "equipment" SET DATA TYPE VARCHAR(150),
  ALTER COLUMN "assetNumber" SET DATA TYPE VARCHAR(50),
  ALTER COLUMN "description" SET DATA TYPE VARCHAR(2000),
  ALTER COLUMN "location" SET DATA TYPE VARCHAR(150),
  ALTER COLUMN "rating" SET DATA TYPE SMALLINT,
  ALTER COLUMN "feedback" SET DATA TYPE VARCHAR(500),
  ALTER COLUMN "floor" SET DATA TYPE SMALLINT USING (
    CASE
      WHEN btrim("floor") ~ '^[0-9]{1,2}$' THEN btrim("floor")::smallint
      WHEN btrim("floor") ~ '^-[1-5]$' THEN btrim("floor")::smallint
      WHEN upper(btrim("floor")) ~ '^B[1-5]$' THEN -(substring(upper(btrim("floor")) FROM 2)::smallint)
      WHEN upper(btrim("floor")) = 'G' THEN 0
    END
  );

ALTER TABLE "RepairImage"
  ALTER COLUMN "filename" SET DATA TYPE VARCHAR(100),
  ALTER COLUMN "mimeType" SET DATA TYPE VARCHAR(50);

ALTER TABLE "RequestActivity" ALTER COLUMN "message" SET DATA TYPE VARCHAR(2000);

ALTER TABLE "LoginThrottle" DROP CONSTRAINT "LoginThrottle_pkey",
  ALTER COLUMN "key" SET DATA TYPE VARCHAR(254),
  ADD CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key");

ALTER TABLE "Notification"
  ALTER COLUMN "title" SET DATA TYPE VARCHAR(200),
  ALTER COLUMN "message" SET DATA TYPE VARCHAR(2000),
  ALTER COLUMN "link" SET DATA TYPE VARCHAR(300);

ALTER TABLE "PushSubscription"
  ALTER COLUMN "endpoint" SET DATA TYPE VARCHAR(2048),
  ALTER COLUMN "p256dh" SET DATA TYPE VARCHAR(200),
  ALTER COLUMN "auth" SET DATA TYPE VARCHAR(100),
  ALTER COLUMN "userAgent" SET DATA TYPE VARCHAR(300);

-- 3) Rules the database enforces from now on (NULL always passes) ------------

ALTER TABLE "User"
  ADD CONSTRAINT "User_name_check" CHECK (char_length(btrim("name")) >= 2),
  ADD CONSTRAINT "User_email_check" CHECK ("email" = lower("email") AND "email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  ADD CONSTRAINT "User_phone_check" CHECK ("phone" ~ '^0[0-9]{8,9}$'),
  ADD CONSTRAINT "User_department_check" CHECK (char_length(btrim("department")) >= 2);

ALTER TABLE "Building"
  ADD CONSTRAINT "Building_name_check" CHECK (char_length(btrim("name")) >= 2),
  ADD CONSTRAINT "Building_code_check" CHECK ("code" ~ '^[A-Z0-9-]{1,10}$');

ALTER TABLE "Category" ADD CONSTRAINT "Category_name_check" CHECK (char_length(btrim("name")) >= 2);

ALTER TABLE "QrTag"
  ADD CONSTRAINT "QrTag_id_check" CHECK ("id" ~ '^[A-Za-z0-9]{4,32}$'),
  ADD CONSTRAINT "QrTag_equipment_check" CHECK (char_length(btrim("equipment")) >= 2),
  ADD CONSTRAINT "QrTag_assetNumber_check" CHECK (char_length(btrim("assetNumber")) >= 2),
  ADD CONSTRAINT "QrTag_floor_check" CHECK ("floor" BETWEEN -5 AND 99),
  ADD CONSTRAINT "QrTag_location_check" CHECK (char_length(btrim("location")) >= 2);

ALTER TABLE "RepairRequest"
  ADD CONSTRAINT "RepairRequest_code_check" CHECK ("code" ~ '^RP-[0-9]{6}-[0-9]{4,6}$'),
  ADD CONSTRAINT "RepairRequest_equipment_check" CHECK (char_length(btrim("equipment")) >= 2),
  ADD CONSTRAINT "RepairRequest_assetNumber_check" CHECK (char_length(btrim("assetNumber")) >= 2),
  ADD CONSTRAINT "RepairRequest_description_check" CHECK (char_length(btrim("description")) >= 5),
  ADD CONSTRAINT "RepairRequest_floor_check" CHECK ("floor" BETWEEN -5 AND 99),
  ADD CONSTRAINT "RepairRequest_location_check" CHECK (char_length(btrim("location")) >= 2),
  ADD CONSTRAINT "RepairRequest_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "RepairRequest_feedback_check" CHECK (char_length(btrim("feedback")) >= 1);

ALTER TABLE "RepairImage"
  ADD CONSTRAINT "RepairImage_filename_check" CHECK ("filename" ~ '^[A-Za-z0-9_-]+\.(jpg|png|webp)$'),
  ADD CONSTRAINT "RepairImage_mimeType_check" CHECK ("mimeType" IN ('image/jpeg', 'image/png', 'image/webp')),
  ADD CONSTRAINT "RepairImage_size_check" CHECK ("size" BETWEEN 1 AND 8388608);

ALTER TABLE "RequestActivity" ADD CONSTRAINT "RequestActivity_message_check" CHECK (char_length(btrim("message")) >= 1);

ALTER TABLE "LoginThrottle" ADD CONSTRAINT "LoginThrottle_failures_check" CHECK ("failures" >= 0);

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_title_check" CHECK (char_length(btrim("title")) >= 1),
  ADD CONSTRAINT "Notification_message_check" CHECK (char_length(btrim("message")) >= 1),
  ADD CONSTRAINT "Notification_link_check" CHECK ("link" LIKE '/%');

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_endpoint_check" CHECK ("endpoint" LIKE 'https://%');
