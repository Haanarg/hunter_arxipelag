#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {inspectRepository}=require('../tools/repository-audit.cjs');
const result=inspectRepository();
assert.equal(result.runtime.missing.length,0,'faltaria un script clàssic de producció');
assert.equal(result.runtime.duplicates.length,0,'runtime clàssic duplicat');
assert.equal(result.productionEsm.missing.length,0,'import ESM de producció no resolt');
assert(result.runtime.count>50,'el runtime original manté tots els sistemes');
assert(result.laboratories.total>10,'la classificació dels laboratoris és representativa');
assert(result.laboratories.noInternalRefs.includes('coop.html')||
 result.laboratories.internalRefs['coop.html'],
 'el client legacy conserva la seva URL fins que es comprovi compatibilitat');
console.log('PASS: inventari de dependències, runtime i laboratoris, sense esborrar-los');
