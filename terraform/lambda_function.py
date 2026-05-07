import urllib.request
import os

def lambda_handler(event, context):
    api_url = os.environ.get('API_URL', 'http://localhost/api')
    api_key = os.environ.get('API_KEY', '')
    
    req = urllib.request.Request(f"{api_url}/ingest/pull/1", method="POST")
    req.add_header("X-API-Key", api_key)
    
    try:
        response = urllib.request.urlopen(req)
        print(f"Triggered Pull Ingestion: {response.getcode()}")
        return {"statusCode": 200, "body": "Success"}
    except Exception as e:
        print(f"Failed to trigger ingestion: {str(e)}")
        return {"statusCode": 500, "body": str(e)}