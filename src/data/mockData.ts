import { PackagingInspection, FGWeightCheck, RawMaterialReceiving, RMWeightCheck, ExpDateRecord, MasterData } from '../types';

// Embedded CSV raw data provided by the user
const USER_CSV_DATA = `วันที่,รหัสสินค้า,Batch,จำนวน Kg.,น้ำหนัก Standard Kg.,"สุ่มตรวจ เช่น ถุง, ถัง, กล่อง, กรง",ผ่าน,ไม่ผ่าน,น้ำหนักที่ชั่งได้ (Kg.),หมายเหตุ
1/7/2569,TS H991,690733,930,500,"2 , กรง",TRUE,FALSE,554.8/564,
1/7/2569,TS166,690711,800,20,"4 , กล่อง",TRUE,FALSE,20.50/20.55/20.60/20.53,
2/7/2569,TS H991,690734,930,500,"2 , กรง",TRUE,FALSE,540/563.6,
3/7/2569,TS H716,690711,1100,25,"4 , กระสอบ",TRUE,FALSE,24.18/24.20/24.18/24.20,
6/7/2569,TS H716,690712,1100,25,"4 , กระสอบ",TRUE,FALSE,24.18/24.20/24.18/24.20,
7/7/2569,TS401LV,690704,105,100,"1 , ถัง",TRUE,FALSE,105.5,
7/7/2569,TS H997,690706,1000,25,"4 , กระสอบ",TRUE,FALSE,25.30/25.30/25.30/25.30,
8/7/2569,TS H997,690707,1000,25,"4 , กระสอบ",TRUE,FALSE,25.30/25.30/25.30/25.30,
10/7/2569,TS 425,690710,1000,200,"3 , ถัง",TRUE,FALSE,200/200/200,
10/7/2569,TS H935A,690705,1000,20,"4 , กล่อง",TRUE,FALSE,20.49/20.66/20.63/20.63,
10/7/2569,TS 418,690712,210,100,"1 , ถัง",TRUE,FALSE,105.98,
13/7/2569,TS H914AA,690704,1000,25,"4 , กระสอบ",TRUE,FALSE,25.30/25.30/25.30/25.30,
13/7/2569,TS 425,690711,205,200,"2 , ถัง",TRUE,FALSE,200/200,
15/7/2569,TS H932,690707,400,650,"1 , กรง",TRUE,FALSE,713,
16/7/2569,TS H914,690702,500,25,"4 , กระสอบ",TRUE,FALSE,25.20/25.18/25.20/25.18,
17/7/2569,TS H935A,690706,1000,20,"4 , กล่อง",TRUE,FALSE,20.49/20.66/20.63/20.63,
20/7/2569,TS 307A,690704,1200,100,"2 , ถัง",TRUE,FALSE,106/106,
21/7/2569,TS402,690707,320,20,"4 , กล่อง",TRUE,FALSE,20.60/20.55/20.60/20.60,
21/7/2569,TS166,690712,200,20,"4 , กล่อง",TRUE,FALSE,20.50/20.55/20.50/20.60,
22/7/2569,TS166-3C,690703,205,100,"2 , ถัง",TRUE,FALSE,104.60/105,
27/7/2569,TS 417A,690715,300,100,"4 , กล่อง",TRUE,FALSE,105.50/25.50/25.40/25.50,
27/7/2026,TS237,690705,210,100,"1 , ถัง",TRUE,FALSE,105,
27/7/2026,TS166,690713,1200,20,"4 , กล่อง",TRUE,FALSE,20.50/20.55/20.52/20.65,
29/7/2026,Semi238A,690701,800,100,"2 , ถัง",TRUE,FALSE,106.50/106.50,
30/7/2026,TS H738,690713,1010,25,"4 , กระสอบ",TRUE,FALSE,25.20/25.20/25.20/25.20,
31/7/2026,TS H738,690714,1010,25,"4 , กระสอบ",TRUE,FALSE,25.20/25.20/25.20/25.20,
3/8/2026,TS H991,69000357,950,500,"2 , กรง",TRUE,FALSE,554.80/563.40,
3/8/2026,TS306A,690802,195,100,"2 , ถัง",TRUE,FALSE,105.5/105.6,
4/8/2026,TS 425,690812,1010,25,"5 , กล่อง",TRUE,FALSE,25.40/25.50/25.50/26.10/25.70,
5/8/2026,TS 417A,690816,310,100,"3 , ถัง",PASS,,105.50/105.50/105.60,
5/8/2026,TS H991,690836,950,500,"2 , กรง",PASS,,554.2/554.3,
6/8/2026,TS H935D,690810,1000,20,"4 , กล่อง",PASS,,20.45/20.48/20.59/20.51,
2/9/2569,TS H935DHV,690905,1000,,,,,,
7/8/2026,TS166-1,690807,2100,"1,050","2 , เบ๊าท์",PASS,,1110/1110,
10/8/2026,TS H935C,690805,1000,20,"4 , กล่อง",PASS,,20.54/20.63/20.56/20.66,
11/8/2026,TS H716,690813,1100,25,"4 , กระสอบ",PASS,,24.18/24.20/24.20/24.18,
13/8/2026,TS H716,690814,1100,25,"4 , กระสอบ",PASS,,24.18/24.20/24.20/24.18,
14/8/2026,TS 417A,690817,410,25,"2 , กล่อง",PASS,,25.80/25.40,
14/8/2026,TS109,690807,270,25,"3 , กล่อง",PASS,,25.51/25.61/25.51,
17/8/2026,TS 206,690802,500,100,"2 , ถัง",PASS,,104.35/104.53,
17/8/2026,TS402,690808,210,20,"4 , กล่อง",PASS,,20.50/20.65/21.10/20.90,
17/8/2026,TS402,690809,102,20,"2 , กล่อง",PASS,,20.65/20.55,
17/8/2026,TS155HV,690802,103,100,"1 , ถัง",PASS,,105.5,
17/8/2026,TS 238A,690801,2650,"1,200","2 , เบ๊าท์",PASS,,1260/1260,
18/8/2026,TS H946W,690814,900,20,"4 , กระสอบ",PASS,,20.30/20.30/20.30/20.30,
18/8/2026,TS H991,690837,962.2,,,,,,
18/8/2026,TS H991,690837,962.2,,,,,,
19/8/2026,TS H945,690809,900,20,"4 , กระสอบ",PASS,,20.30/20.30/20.30/20.30,
19/8/2026,TS H991,690838,930,500,"2 , กรง",PASS,,561.20/553.20,
19/8/2026,TS401LV,690805,102,100,"1 , ถัง",PASS,,104.55,
20/8/2026,TS H731,690810,1230,25,"5 , กระสอบ",PASS,,25.20/25.20/25.20/25.20/25.20,
21/8/2026,TS H991,690839,930,500,"2 , กรง",PASS,,542.60/564,
24/8/2026,TS H991,690840,930,500,"2 , กรง",PASS,,564.60/540.80,
25/8/2569,TS 238A,690802,2650,"1,200","2 , เบ๊าท์",PASS,,1269/1265,
25/8/2569,TS 425,690813,1010,200,"2 , ถัง",PASS,,200/200,
26/8/2569,TS 417A,690818,315,,,,,,
26/8/2569,TS H991,690841,930,500,"1 , กรง",PASS,,554.6,
26/8/2569,TS166,690814,208,20,"4 , กล่อง",PASS,,20.53/20.52/20.50/20.55,
27/8/2569,TS H991,690842,882,500,"2 , กรง",PASS,,554/540,
28/8/2569,TS H991,690843,930,500,"2 , กรง",PASS,,554.60/555.40,
28/8/2569,TS166,690815,1600,20,"4 , กล่อง",PASS,,20.56/20.58/20.50/20.65,
31/8/2569,TSH819C,690803,1000,25,"4 , กระสอบ",PASS,,24.20/24.20/24.20/24.20,
31/8/2569,TS 425,690814,1010,200,"2 , ถัง",PASS,,200/200,
1/9/2569,TS H829A,690903,950,25,"4 , กระสอบ",PASS,,24.20/24.20/24.20/24.20,
1/9/2569,TS H991,690944,930,500,"2 , กรง",PASS,,564.20/554.60,
1/9/2569,TS 213B,690902,515,,,,,,
1/9/2569,TS 213B,690902,515,,,,,,`;

// Helper to split CSV rows accounting for double quotes
function splitCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Convert BE or AD date format to standard YYYY-MM-DD
function parseCSVDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const parts = dateStr.trim().split('/');
  if (parts.length < 3) return dateStr;
  
  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  
  // Convert Buddhist Era (BE 2569) to Gregorian Era (AD 2026)
  if (year > 2400) {
    year = year - 543;
  }
  
  const dStr = String(day).padStart(2, '0');
  const mStr = String(month).padStart(2, '0');
  const yStr = String(year);
  
  return `${yStr}-${mStr}-${dStr}`;
}

// Parse embedded CSV string into dynamic FGWeightCheck objects
export function parseEmbeddedFGWeight(): FGWeightCheck[] {
  const lines = USER_CSV_DATA.split('\n').map(line => line.trim()).filter(Boolean);
  const records: FGWeightCheck[] = [];
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVRow(lines[i]);
    if (cols.length < 3 || !cols[0] || !cols[1]) continue; // skip blank rows
    
    const rawDate = cols[0];
    const fgCode = cols[1];
    const batch = cols[2];
    const quantityKg = parseFloat(cols[3].replace(/[",\s]/g, '')) || 0;
    const standardWeightKg = parseFloat(cols[4].replace(/[",\s]/g, '')) || 0;
    
    // Parse containerType from column index 5 (e.g. "2 , กรง")
    const containerRaw = cols[5] ? cols[5].replace(/^"|"$/g, '').trim() : '';
    let containerType = 'กล่อง';
    if (containerRaw.includes(',')) {
      containerType = containerRaw.split(',')[1].trim();
    } else if (containerRaw) {
      containerType = containerRaw;
    }

    const passVal = cols[6]?.toUpperCase();
    const failVal = cols[7]?.toUpperCase();
    
    // Determine status
    let status: 'Pass' | 'Fail' | 'Pending' = 'Pending';
    if (passVal === 'TRUE' || passVal === 'PASS') {
      status = 'Pass';
    } else if (failVal === 'TRUE' || failVal === 'FAIL') {
      status = 'Fail';
    }
    
    // Parse weight samples
    const weightStr = cols[8] || '';
    const samples = weightStr ? weightStr.split('/').map(w => parseFloat(w.trim())).filter(w => !isNaN(w) && w > 0) : [];
    
    // Calculate average
    const averageWeight = samples.length > 0 
      ? parseFloat((samples.reduce((sum, val) => sum + val, 0) / samples.length).toFixed(2)) 
      : 0;

    // Parse the actual note from column index 9 (หมายเหตุ)
    const note = cols[9] ? cols[9].replace(/^"|"$/g, '').trim() : '';
      
    records.push({
      id: `fgw-csv-${i}`,
      date: parseCSVDate(rawDate),
      fgCode,
      batch,
      quantityKg,
      standardWeightKg,
      samples,
      averageWeight,
      status,
      containerType,
      note: note || undefined,
      inspector: 'ประเสริฐ ศรีสุข (QC)'
    });
  }
  
  return records;
}

// Parse distinct product codes from CSV data to seed Master Data
export function extractFGCodesFromCSV(): string[] {
  const lines = USER_CSV_DATA.split('\n').map(line => line.trim()).filter(Boolean);
  const codeSet = new Set<string>();
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVRow(lines[i]);
    if (cols.length > 1 && cols[1]) {
      codeSet.add(cols[1].trim());
    }
  }
  
  return Array.from(codeSet).filter(Boolean).sort();
}

// Dynamic master list initialization
const parsedFGCodes = extractFGCodesFromCSV();
const parsedFGWeightRecords = parseEmbeddedFGWeight();

export const INITIAL_MASTER_DATA: MasterData = {
  customers: [
    'บจก. สยามบรรจุภัณฑ์ (Siam Packaging)',
    'บจก. เอกชัย อินเตอร์เนชั่นแนล (Ekachai International)',
    'Thai Container Group Co., Ltd.',
    'บจก. กรุงเทพ พลาสติก รีไซเคิล',
    'Apex Food & Beverage Co., Ltd.'
  ],
  fgCodes: parsedFGCodes.length > 0 ? parsedFGCodes : [
    'TS H935A (กาวร้อนใสเกรดเอ)',
    'TS H935C (กาวร้อนใสพรีเมียม)',
    'TS402 (กาวน้ำติดกล่อง)',
    'TS H716B (กาวติดฝาขวด)',
    'TS H716 (กาวอเนกประสงค์)'
  ],
  rmCodes: [
    'RM-PE-100 (เม็ดพลาสติก PE)',
    'RM-PP-200 (เม็ดพลาสติก PP)',
    'RM-PET-300 (ขวด PET เปล่า)',
    'RM-PVC-400 (ฟิล์มยืด PVC)',
    'RM-ADD-500 (สารแต่งเติมความเหนียว)'
  ],
  suppliers: [
    'บจก. ยูเนี่ยน เคมิคอลส์ เทรดดิ้ง',
    'SCG Chemicals Public Co., Ltd.',
    'PTT Global Chemical',
    'บจก. รุ่งเรือง พลาสติก เคมี',
    'Siam Polymers Co., Ltd.'
  ]
};

export const INITIAL_PACKAGING: PackagingInspection[] = [
  {
    id: 'pkg-1',
    date: '2026-09-07',
    docNo: 'PKG-2026-0001',
    fgCode: parsedFGCodes[0] || 'TS H991',
    batch: '260907A',
    quantityKg: 1500,
    customer: 'บจก. สยามบรรจุภัณฑ์ (Siam Packaging)',
    status: 'Pass',
    inspector: 'ประเสริฐ ศรีสุข (QC)'
  },
  {
    id: 'pkg-2',
    date: '2026-09-06',
    docNo: 'PKG-2026-0002',
    fgCode: parsedFGCodes[1] || 'TS166',
    batch: '260906B',
    quantityKg: 800,
    customer: 'Thai Container Group Co., Ltd.',
    status: 'Pass',
    inspector: 'ประเสริฐ ศรีสุข (QC)'
  }
];

export const INITIAL_FG_WEIGHT: FGWeightCheck[] = parsedFGWeightRecords.length > 0 ? parsedFGWeightRecords : [
  {
    id: 'fgw-1',
    date: '2026-09-07',
    fgCode: 'TS H991',
    batch: '690733',
    quantityKg: 930,
    standardWeightKg: 500,
    samples: [554.8, 564],
    averageWeight: 559.4,
    status: 'Pass',
    containerType: 'กรง',
    note: '',
    inspector: 'ประเสริฐ ศรีสุข (QC)'
  }
];

export const INITIAL_RM_RECEIVING: RawMaterialReceiving[] = [
  {
    id: 'rmr-1',
    date: '2026-09-07',
    docNo: 'RMR-2026-0001',
    rmCode: 'RM-PE-100 (เม็ดพลาสติก PE)',
    batch: 'B-SCG-9031',
    deliveryNo: 'DN-99401',
    poNo: 'PO-6912',
    quantityKg: 5000,
    supplier: 'SCG Chemicals Public Co., Ltd.',
    status: 'Pass',
    inspector: 'สมชาย เจริญสุข'
  },
  {
    id: 'rmr-2',
    date: '2026-09-06',
    docNo: 'RMR-2026-0002',
    rmCode: 'RM-ADD-500 (สารแต่งเติมความเหนียว)',
    batch: 'ADD-882',
    deliveryNo: 'DN-8812',
    poNo: 'PO-6844',
    quantityKg: 500,
    supplier: 'บจก. ยูเนี่ยน เคมิคอลส์ เทรดดิ้ง',
    status: 'Pass',
    inspector: 'สมชาย เจริญสุข'
  }
];

export const INITIAL_RM_WEIGHT: RMWeightCheck[] = [
  {
    id: 'rmw-1',
    date: '2026-09-07',
    rmCode: 'RM-PE-100 (เม็ดพลาสติก PE)',
    batch: 'B-SCG-9031',
    quantityKg: 5000,
    standardWeightKg: 25,
    samples: [25.1, 24.9, 25.0, 25.1, 25.0],
    averageWeight: 25.02,
    status: 'Pass',
    note: 'ค่าน้ำหนักสุ่มตรวจคงที่',
    inspector: 'สมชาย เจริญสุข'
  }
];

export const INITIAL_EXP_DATE: ExpDateRecord[] = [
  {
    id: 'exp-1',
    date: '2026-09-07',
    rmCode: 'RM-PE-100 (เม็ดพลาสติก PE)',
    batch: 'B-SCG-9031',
    mfgDate: '2026-03-01',
    expDate: '2028-03-01',
    status: 'Active',
    note: 'สภาพถุงสมบูรณ์ ไม่มีความชื้น',
    inspector: 'สมชาย เจริญสุข'
  },
  {
    id: 'exp-2',
    date: '2026-09-06',
    rmCode: 'RM-ADD-500 (สารแต่งเติมความเหนียว)',
    batch: 'ADD-882',
    mfgDate: '2026-01-10',
    expDate: '2027-01-10',
    status: 'Near Expiry',
    note: 'เหลืออายุใช้งานประมาณ 4 เดือน ควรจัดคิวใช้งานเป็นลำดับแรก',
    inspector: 'สมชาย เจริญสุข'
  }
];
