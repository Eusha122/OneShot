import urllib.request
import json
import urllib.error

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/learners/', 
    data=json.dumps({'language_preference': 'en'}).encode('utf-8'), 
    headers={'Content-Type': 'application/json'}, 
    method='POST'
)

try:
    response = urllib.request.urlopen(req)
    print("SUCCESS:")
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"ERROR {e.code}:")
    print(e.read().decode("utf-8"))
