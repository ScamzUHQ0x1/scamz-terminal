import sys
import json
import time

def fake_scan(target):
    
    return [
        {"port": "80", "service": "http", "status": "open"},
        {"port": "443", "service": "https", "status": "open"},
        {"port": "22", "service": "ssh", "status": "closed"}
    ]

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = sys.argv[1]
        time.sleep(1) 
        results = fake_scan(target)
        print(json.dumps(results)) 