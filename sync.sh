#!/usr/bin/env bash
# Wrapper local — sincronitza _shared_nexe/ amb aquest projecte.
# Veure /c/Projectes/_shared_nexe/scripts/sync.sh per la lògica completa.
exec bash /c/Projectes/_shared_nexe/scripts/sync.sh "$(cd "$(dirname "$0")" && pwd)"
