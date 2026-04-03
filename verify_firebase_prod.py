import urllib.request
import re

try:
    # Get homepage
    resp = urllib.request.urlopen('https://astrocrm-production.up.railway.app/', timeout=20).read().decode('utf-8','ignore')
    print('[OK] Homepage loaded')
    
    # Find bundle URL
    match = re.search(r'assets/(index-[a-zA-Z0-9]+\.js)', resp)
    if match:
        bundle_name = match.group(1)
        bundle_url = f'https://astrocrm-production.up.railway.app/assets/{bundle_name}'
        print(f'[OK] Found bundle: {bundle_name}')
        
        # Get bundle
        bundle_resp = urllib.request.urlopen(bundle_url, timeout=20).read().decode('utf-8','ignore')
        
        # Check for Firebase config
        has_project = 'gen-lang-client' in bundle_resp
        has_db = 'ai-studio-9fbf6389' in bundle_resp
        has_api_url = 'astrocrm-production.up.railway.app' in bundle_resp
        
        print(f'[FIREBASE] Project ID in bundle: {has_project}')
        print(f'[FIRESTORE] DB ID in bundle: {has_db}')
        print(f'[API_URL] in bundle: {has_api_url}')
        
        if has_project and has_db and has_api_url:
            print('\n*** SUCCESS: Prod has all Firebase env vars injected ***')
        else:
            print('\n*** WARNING: Some Firebase vars missing from bundle ***')
    else:
        print('[ERR] Could not find bundle URL')
except Exception as e:
    print(f'[ERR] {e}')
