// The calibrated material pipeline now lives in Python.
import {spawnSync} from 'node:child_process';
const result=spawnSync('python3',[new URL('./build-materials.py',import.meta.url).pathname],{stdio:'inherit'});
process.exit(result.status??1);
