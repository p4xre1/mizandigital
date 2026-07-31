insert into public._meta (key, value) values ('seeded', 'true') on conflict (key) do update set value = excluded.value;
