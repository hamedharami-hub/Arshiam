#!/bin/sh
# Local Firebase emulators for QA (auth:9099, firestore:8085). The app uses them only in dev
# when localStorage "arsh_use_emulator" = "1"; production builds never connect to them.
cd "$(dirname "$0")"
cp ../../firestore.rules ./firestore.rules
GCE_METADATA_HOST=0.0.0.0 nohup /app/node_modules/.bin/firebase emulators:start --only auth,firestore --project demo-arshnaz --config firebase.json > emu.log 2>&1 &
sleep 30
UID_=$(curl -s -X POST "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake" -H "Content-Type: application/json" \
  -d '{"email":"test.arshnaz@example.com","password":"Test123456","returnSecureToken":true}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('localId',''))")
[ -n "$UID_" ] && node seed.mjs "$UID_"
