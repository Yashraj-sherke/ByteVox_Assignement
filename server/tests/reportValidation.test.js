const { validateReport } = require('../services/reportValidation');
const columns = [{name:'total'},{name:'region'}];
describe('Report definition validation', () => {
 it('rejects null blocks without throwing', () => expect(validateReport({blocks:[null]}, columns)).toBeTruthy());
 it('rejects negative table limits', () => expect(validateReport({blocks:[{id:'1',type:'table',config:{sortColumn:'total',limit:-1}}]}, columns)).toBeTruthy());
 it('rejects unknown column references and aggregations', () => {
  expect(validateReport({blocks:[{id:'1',type:'metric',config:{column:'secret',aggregation:'sum'}}]},columns)).toBeTruthy();
  expect(validateReport({blocks:[{id:'1',type:'metric',config:{column:'total',aggregation:'invalid'}}]},columns)).toBeTruthy();
 });
 it('rejects malformed filters', () => expect(validateReport({filters:{category:{column:'region',values:'North'}}},columns)).toBeTruthy());
 it('accepts a valid filtered metric', () => expect(validateReport({blocks:[{id:'1',type:'metric',config:{column:'total',aggregation:'sum'}}],filters:{category:{column:'region',values:['North']}}},columns)).toBeNull());
});
