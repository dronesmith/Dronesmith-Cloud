import sys
from pymongo import MongoClient
from bson.objectid import ObjectId

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print 'No id argument.'
        sys.exit(1)

    # grab the snippet
    client = MongoClient()
    db = client['forge']
    codes = db['codes']
    script = codes.find_one({"_id": ObjectId(sys.argv[1])})

    # reflect the code
    exec script['content']
