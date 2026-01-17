alter table receipts
  alter column customer_name drop not null,
  alter column phone drop not null,
  alter column purchase_date drop not null,
  alter column vin_image_url drop not null,
  alter column engine_image_url drop not null,
  alter column symptom drop not null,
  alter column service_detail drop not null;

alter table vehicle_profiles
  alter column customer_name drop not null,
  alter column phone drop not null,
  alter column purchase_date drop not null;
