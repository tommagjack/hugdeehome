-- 1. Create function to generate next employee ID (HDHxxx)
CREATE OR REPLACE FUNCTION get_next_employee_id()
RETURNS TEXT
SECURITY DEFINER AS $$
DECLARE
  max_num INT := 0;
  u RECORD;
  num INT;
BEGIN
  FOR u IN SELECT employee_id FROM public.users WHERE employee_id LIKE 'HDH%' LOOP
    BEGIN
      num := substring(u.employee_id from '^HDH(\d+)')::INTEGER;
      IF num > max_num THEN
        max_num := num;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore malformed employee_id
    END;
  END LOOP;
  RETURN 'HDH' || lpad((max_num + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to submit a job application anonymously
CREATE OR REPLACE FUNCTION apply_for_job(
  username_val TEXT,
  password_val TEXT,
  fullname_val TEXT,
  title_val TEXT,
  nickname_val TEXT,
  citizen_id_val TEXT,
  gender_val TEXT,
  dob_val TEXT,
  phone_val TEXT,
  email_val TEXT,
  bank_name_val TEXT,
  bank_account_no_val TEXT,
  avatar_url_val TEXT,
  citizen_id_doc_val TEXT,
  house_reg_doc_val TEXT,
  bank_book_doc_val TEXT,
  license_doc_val TEXT,
  other_doc_val TEXT
)
RETURNS TEXT
SECURITY DEFINER AS $$
DECLARE
  next_id TEXT;
BEGIN
  -- Generate next employee ID
  next_id := get_next_employee_id();

  -- Insert into public.users
  INSERT INTO public.users (
    username, password, fullname, role, status, employee_id,
    employee_type, title, nickname, citizen_id, gender, dob,
    position, start_date, phone, email, basic_salary, bank_name,
    bank_account_no, avatar_url, citizen_id_doc, house_reg_doc,
    bank_book_doc, license_doc, other_doc, created_at
  ) VALUES (
    LOWER(TRIM(username_val)), password_val, fullname_val, 'Staff', 'Pending', next_id,
    'พนักงานประจำ', title_val, nickname_val, citizen_id_val, gender_val, dob_val,
    'รอแอดมินกำหนดตำแหน่ง', CURRENT_DATE::TEXT, phone_val, email_val, 0, bank_name_val,
    bank_account_no_val, avatar_url_val, citizen_id_doc_val, house_reg_doc_val,
    bank_book_doc_val, license_doc_val, other_doc_val, NOW()
  );

  RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Grant execute permissions to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION get_next_employee_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_for_job(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
