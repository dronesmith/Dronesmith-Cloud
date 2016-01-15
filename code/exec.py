import sys
from pymongo import MongoClient
from bson.objectid import ObjectId

from lucikit import *
from pymavlink import *

__SIMLY__ = '0.0.0.0:4006'
__DRONE__ = '0.0.0.0:14551'

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print 'Invalid arguments.'
        sys.exit(1)

    if sys.argv[1] == '--id':
        # grab the snippet
        client = MongoClient()
        db = client['forge']
        codes = db['codes']
        script = codes.find_one({"_id": ObjectId(sys.argv[1])})

        # reflect the code
        exec script['content']
    elif sys.argv[1] == '--code':
        exec sys.argv[2]
    else:
        print 'Invalid argument.'
