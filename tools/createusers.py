"""
    Purpose: Creates
    Author: Paul Fjare
"""
import json
import requests
import string
import random
import time

headers = {
    'admin-key':        ''
    'Content-Type':     'application/json'
}

# Random password generator
def random_generator(size=8, chars='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ' + string.digits):
    return ''.join(random.choice(chars) for x in range(size))

with open('.json') as json_data:
    jsonInputText = json.load(json_data)
    json_data.close()

count = 0
jsonOutputText = []
for i in jsonInputText:
    count +=1

    password = random_generator()

    response = requests.post('http://api.dronesmith.io/admin/user', json={
            "email": i['email'],
            "password": password,
            "company": "UC Merced",
            "firstname": i['first_name'],
            "lastname": i['last_name'],
            "phone": "555-555-5555",
            "country": "1"
        }, headers=headers)
    jsonReturn = json.loads(response.text)
    print json.dumps(jsonReturn, indent=2, sort_keys=True)

    jsonOutputText.append({'email':i['email'],'first_name':i['first_name'],'last_name':i['last_name'],'password':password, 'api_key':jsonReturn['apiKey']})
    time.sleep(.2)
print "Total Users Added = " + count

DataFile = open(".json", "w")
DataFile.write(json.dumps(jsonOutputText, indent=2, sort_keys=True))
DataFile.close()
