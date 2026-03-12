import urllib.request, json, base64, time

API_KEY = "99dc1e2efcce7d99eeded260f62dbd7c498fd39f"
SUBDOMAIN = "tecknoworks"
creds = base64.b64encode(f"{API_KEY}:x".encode()).decode()
auth_headers = {"Authorization": f"Basic {creds}"}

employees = [
  ("e8f83e7d-5ba7-437b-bc29-8b99f10de4b0","254"),("bd57301d-1b41-4c57-947a-f41d970fd405","139"),
  ("2616127f-5cd1-4704-86d3-39b21d0836ea","326"),("3137ecea-c5de-4cf3-8e2e-226b8fa37f06","299"),
  ("b2372a89-d9a5-4116-816a-32e361c90f28","308"),("0f8fe62c-cfa6-4403-81fa-e0dd6a0c1a69","293"),
  ("28637d2b-f332-49d1-9a07-c3568b768cb5","123"),("10323d34-f3cd-4430-bd11-9a037845a37e","318"),
  ("6f165bd7-61f6-407f-a15c-102e766a6c0a","255"),("f12e2cee-8a0f-4db6-ba55-27bcf30693ea","310"),
  ("25ed0703-47d1-4e22-ba43-448a58431a2f","204"),("242d67a7-28c5-45cd-a3da-c7e5618a76a0","152"),
  ("dcedef36-8189-4d1e-9f89-ec6fae07e376","276"),("3d7de0f4-fb0c-499a-962e-443144eea50f","300"),
  ("e383188b-16c9-42fb-a146-8f04d8ea14a0","334"),("f4af39e5-2291-405d-aa80-48c7a26fc44e","316"),
  ("26d81dfa-0b44-45ce-859f-3f5e3d1ea19a","302"),("9f4e4260-df8d-48e1-8a7e-e078f978bddf","230"),
  ("1c37d672-5465-414f-bd20-bbe4b2c2b3ee","329"),("246b1ebb-cc02-45a2-91ed-2bea095aed05","128"),
  ("afcf2c00-d444-4efb-ba2b-2cac25e35fb5","337"),("04a3fb75-c015-48b0-bd05-72be480c37ef","306"),
  ("e6efe78d-ba6b-4537-bf2c-eebfb1364a6e","278"),("199aa59f-0459-44ff-8fe1-a521c6e415c1","119"),
  ("93877b83-097e-452a-8bd4-6d032aae318c","269"),("d4444053-728a-4c36-aea1-69fd7382c73f","294"),
  ("48f32e5e-cfd3-4805-97da-96be59760f5e","312"),("7add1eaf-8715-41f0-8ac5-fce060575c4b","331"),
  ("0a52cc75-1167-48a6-b7d8-cbba1ccb751a","209"),("f1c7c34a-d9c5-47bb-afd8-65e98710f6c8","168"),
  ("3903f17a-529e-4629-a51a-ecefc4a64681","311"),("193f158a-b2e3-4d8d-b342-bd23839a008f","126"),
  ("5e7d938c-d04c-4bf2-9b78-e9ad3639d178","184"),("f19aa82b-2284-4729-85a0-7a1f3d13f81a","154"),
  ("346d1424-c385-492f-b547-b62b42dfdd54","121"),("75ff38f4-5578-47df-a0aa-8bb261fad270","134"),
  ("e69167a3-0278-44c6-92a0-e5093b709c60","207"),("7199399a-b155-4da7-ac51-115815b982eb","336"),
  ("98754b92-cfe6-43e3-b551-72d6d740f261","162"),("71b420b2-d169-494d-83c2-22e839ceff5f","339"),
  ("d61e06e7-1f28-44f0-bfd6-2af993f297fd","120"),("01779c2c-4046-416a-88a4-484608f8246b","125"),
  ("c761b3c6-911b-4f75-bdbf-1412add441ee","202"),("a3991300-a14c-4ef0-88e9-23a82abb6f54","147"),
  ("342c1d5e-0213-4d88-b5de-5031672e3d2e","138"),("3cadd214-9609-471d-bbe7-3a38bfbd10a5","117"),
  ("f947ef01-15f6-43bd-876b-8101571998ce","314"),("91f17403-a714-4906-ba2b-310bc14eaba2","296"),
  ("9d8e0ad9-74c3-4717-ab7a-161b184b0c86","141"),("d45d7ec5-f490-425d-95a9-4c7dd72ae53e","324"),
  ("f67bff28-0a74-4f97-9cd4-8a4e3fac98f2","301"),("38803350-11bc-4b1c-ba12-47da0406d281","319"),
  ("5db2ce86-2507-4c3b-9a6a-10274898976e","309"),("f925ce74-b54a-4c57-974d-cc1a17e6dba9","317"),
  ("b94f70b1-e27c-4516-ba1d-aaaec4d9a8ab","264"),("d19c548e-6b36-4ea4-b613-fc1a1ef727df","135"),
  ("7bec647d-bf22-47a9-8aae-8630d8012e97","206"),("b34714ee-b653-48d0-9617-37e56eb2c7c8","330"),
  ("42fdca53-4d84-4e24-8f35-8aca83b34ee6","167"),("00ed3bdc-6604-408e-a155-3b49190b4adc","332"),
  ("4e91e622-0679-484c-9219-5c2f9d2af382","226"),("c571bcb1-7dfd-47d4-b44b-3e3232a6a3bc","328"),
  ("93d63c6b-0e9d-4007-89ab-d1a047f23742","136"),("2403333d-c18f-4765-818a-2339053010ce","333"),
  ("9d4b2495-734f-4fc3-b743-b6f2ad63aa51","233"),("397f7de0-9c3a-4e3f-8783-217217647f4f","327"),
  ("793fcc29-26a7-46fa-af71-8cfd75742bc4","303"),("6d8200b4-dd4a-48f4-a5d8-dab68dbe96d8","298"),
]

# Determine default photo size
default_url = f"https://api.bamboohr.com/api/gateway.php/{SUBDOMAIN}/v1/employees/1/photo/small"
req = urllib.request.Request(default_url, headers=auth_headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        default_size = len(resp.read())
except:
    default_size = 4758
print(f"Default size baseline: {default_size}b")

results = {}
has_photo = 0
no_photo = 0

for app_id, bamboo_id in employees:
    url = f"https://api.bamboohr.com/api/gateway.php/{SUBDOMAIN}/v1/employees/{bamboo_id}/photo/small"
    req = urllib.request.Request(url, headers=auth_headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            content_type = resp.headers.get("Content-Type", "image/jpeg")
            size = len(data)
            if size > default_size + 300:
                b64 = base64.b64encode(data).decode()
                results[app_id] = f"data:{content_type};base64,{b64}"
                has_photo += 1
                print(f"  PHOTO {bamboo_id}: {size}b")
            else:
                no_photo += 1
    except Exception as e:
        no_photo += 1
        print(f"  ERR {bamboo_id}: {e}")
    time.sleep(0.1)

print(f"\nHas real photo: {has_photo}, No/default photo: {no_photo}")

with open("photo_updates.json", "w") as f:
    json.dump(results, f)
print("Saved to photo_updates.json")
