// A SYNTHETIC workbook for the Collateral QA: made-up names and codes only, shaped like the real template (same headers, same kinds of defects).
import { buildXlsx } from '../../../src/components/sites/collateral/excel-formation/engine/xlsx-builder.mjs';

export const HEADERS = ['NGAYDULIEU', 'MACNTCTD', 'TENCNTCTD', 'MAKH', 'TENKH', 'MASOBD', 'MALOAIBD', 'NGBDAU', 'NGKT', 'GIATRI', 'GIATRIBDKV', 'NGDINHGIA', 'GTKHAUTRU', 'DSSOHD', 'HOTENCSH', 'GIAYTOCNCSH', 'MSTCSH', 'MOTABD', 'MOTABDS'];
const PHRASES = ['Ke hoach trien khai du an', 'May moc thiet bi san xuat', 'Xe tai 5 tan nhan hieu Hyundai', 'Nha xuong va quyen su dung dat', 'Tai san dam bao theo hop dong'];

/** Expected counts, so the QA can check the page against the design of the fixture instead of against its own output. */
export const EXPECT = { rows: 120, brokenTwins: 12, whitespaceNames: 5, controlContracts: 2, descriptionConflicts: 1, groupConflicts: 2 };

export function buildFixture() {
  const rows = [HEADERS];
  const make = (i, o = {}) => {
    const base = { NGAYDULIEU: '30/09/2026', MACNTCTD: '00000001', TENCNTCTD: 'CN TEST', MAKH: String(100 + (i % 40)).padStart(8, '0'), TENKH: `Cong ty Mau ${i % 40}`, MASOBD: `T${String(i).padStart(5, '0')}`, MALOAIBD: '303', NGBDAU: '20200101', NGKT: null, GIATRI: { n: String(1000 + i) }, GIATRIBDKV: { n: '500' }, NGDINHGIA: '20210101', GTKHAUTRU: null, DSSOHD: `0090${i}/10R`, HOTENCSH: `Nguyen Van ${i % 40}`, GIAYTOCNCSH: null, MSTCSH: null, MOTABD: PHRASES[i % PHRASES.length], MOTABDS: PHRASES[i % PHRASES.length], ...o };
    return HEADERS.map(h => base[h]);
  };
  for (let i = 1; i <= EXPECT.rows; i++) {
    const o = {};
    if (i >= 10 && i < 10 + EXPECT.brokenTwins) { const text = i % 4 === 0 ? 'May moc thi?t bi san xuat' : 'Ke ho?ch trien khai du an'; o.MOTABD = text; o.MOTABDS = text; }
    if (i >= 40 && i < 40 + EXPECT.whitespaceNames) o.TENKH = `  Cong ty Mau ${i} `;
    if (i === 60 || i === 61) o.DSSOHD = `00\u00071/10R${i}`;
    if (i === 70) o.MOTABD = 'May moc khac';
    if (i === 80) o.GIATRI = { n: '1' }; // a second row of the same asset with another value (see below)
    if (i === 90) o.MOTABD = o.MOTABDS = 'Cong ty Công Việt';
    rows.push(make(i, o));
  }
  rows.push(make(80, { GIATRI: { n: '2' }, DSSOHD: '0090x/10R', MASOBD: 'T00080', MAKH: String(100 + (80 % 40)).padStart(8, '0') }));
  rows.push([]);
  return buildXlsx([{ name: 'MAU9_TEST', autoFilter: true, hiddenRows: [3, 4, 5], rows }]);
}

/** A tiny workbook with exactly one broken description (in both columns): fixing it unlocks the JSON. */
export function buildSmallFixture() {
  const make = (o = {}) => { const base = { NGAYDULIEU: '30/09/2026', MACNTCTD: '00000001', TENCNTCTD: 'CN TEST', MAKH: '00000123', TENKH: 'Cong ty Mau', MASOBD: 'T00001', MALOAIBD: '303', NGBDAU: '20200101', NGKT: null, GIATRI: { n: '1000' }, GIATRIBDKV: { n: '500.10' }, NGDINHGIA: '20210101', GTKHAUTRU: null, DSSOHD: '00901H6568/10R', HOTENCSH: 'Nguyen Van A', GIAYTOCNCSH: '001234567890', MSTCSH: null, MOTABD: 'Ke hoach trien khai', MOTABDS: 'Ke hoach trien khai', ...o }; return HEADERS.map(h => base[h]); };
  return buildXlsx([{ name: 'MAU9_TEST', autoFilter: true, rows: [HEADERS,
    make(),
    make({ MASOBD: 'T00002', MOTABD: 'Ke ho?ch trien khai', MOTABDS: 'Ke ho?ch trien khai' }),
    make({ DSSOHD: '0002/10R', GIATRIBDKV: { n: '0.20' } }),
    make({ MAKH: '00000124', TENKH: 'Cong ty Hai', MASOBD: 'T00003', HOTENCSH: null, GIAYTOCNCSH: null })] }]);
}
