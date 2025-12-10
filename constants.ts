import { Cleaner, Location, CleaningLog } from './types';

export const CLEANERS: Cleaner[] = [
  { id: 'c1', name: 'John Doe', avatar: 'https://picsum.photos/100/100?random=1' },
  { id: 'c2', name: 'Jane Smith', avatar: 'https://picsum.photos/100/100?random=2' },
  { id: 'c3', name: 'Mike Johnson', avatar: 'https://picsum.photos/100/100?random=3' },
];

export const LOCATIONS: Location[] = [
  { id: 'loc1', nameZh: '广场', nameEn: 'Outdoor Square', zone: 'Outdoor', targetDailyFrequency: 10 },
  { id: 'loc2', nameZh: '入口（包含购物车购物篮）', nameEn: 'Entrance & Carts', zone: 'Entrance', targetDailyFrequency: 24 },
  { id: 'loc3', nameZh: '右边走廊', nameEn: 'Right Corridor', zone: 'Sales Floor', targetDailyFrequency: 15 },
  { id: 'loc4', nameZh: '2号台及粮油通道', nameEn: 'Checkout 2 & Grains/Oil', zone: 'Sales Floor', targetDailyFrequency: 15 },
  { id: 'loc5', nameZh: '食品区通道', nameEn: 'Food Aisle', zone: 'Sales Floor', targetDailyFrequency: 15 },
  { id: 'loc6', nameZh: '3号、4号收银机台', nameEn: 'Checkout 3 & 4', zone: 'Front End', targetDailyFrequency: 20 },
  { id: 'loc7', nameZh: '冰品区', nameEn: 'Ice Cream Zone', zone: 'Sales Floor', targetDailyFrequency: 12 },
  { id: 'loc8', nameZh: '转盘区走廊', nameEn: 'Turntable Corridor', zone: 'Sales Floor', targetDailyFrequency: 15 },
  { id: 'loc9', nameZh: '百货区', nameEn: 'General Merchandise', zone: 'Sales Floor', targetDailyFrequency: 10 },
  { id: 'loc10', nameZh: '卫生间', nameEn: 'Restroom', zone: 'Facilities', targetDailyFrequency: 24 },
  { id: 'loc11', nameZh: '卫生巾、纸巾、米粉区副通道', nameEn: 'Hygiene & Baby Food Aisle', zone: 'Sales Floor', targetDailyFrequency: 12 },
  { id: 'loc12', nameZh: '左边走廊', nameEn: 'Left Corridor', zone: 'Sales Floor', targetDailyFrequency: 15 },
  { id: 'loc13', nameZh: '1号台5号台', nameEn: 'Checkout 1 & 5', zone: 'Front End', targetDailyFrequency: 20 },
  { id: 'loc14', nameZh: '干货和冻品区主通道（含半圆垃圾桶、果切区）', nameEn: 'Dry/Frozen Main Aisle', zone: 'Sales Floor', targetDailyFrequency: 18 },
  { id: 'loc15', nameZh: '蔬果区', nameEn: 'Produce Section', zone: 'Fresh', targetDailyFrequency: 18 },
  { id: 'loc16', nameZh: '水产区', nameEn: 'Seafood Section', zone: 'Fresh', targetDailyFrequency: 20 },
  { id: 'loc17', nameZh: '肉品区', nameEn: 'Meat Section', zone: 'Fresh', targetDailyFrequency: 20 },
  { id: 'loc18', nameZh: '调料区', nameEn: 'Condiments Aisle', zone: 'Sales Floor', targetDailyFrequency: 12 },
  { id: 'loc19', nameZh: '熟食烘焙区（含半圆垃圾桶）', nameEn: 'Deli & Bakery', zone: 'Fresh', targetDailyFrequency: 20 },
  { id: 'loc20', nameZh: '饮料区', nameEn: 'Beverage Section', zone: 'Sales Floor', targetDailyFrequency: 15 },
];

export const TRANSLATIONS = {
  en: {
    appTitle: "CleanTrack",
    manager: "Manager",
    cleanerApp: "Cleaner App",
    qrCodes: "Print QR Codes",
    reset: "Reset Demo",
    dailyCompliance: "Daily Compliance",
    activeIssues: "Active Issues",
    totalCleanings: "Total Cleanings",
    runAnalysis: "Run Operations Analysis",
    analyzing: "Analyzing patterns...",
    analysisPrompt: "Click 'Run Analysis' to generate an executive summary.",
    liveStatus: "Live Location Status",
    search: "Search zones...",
    location: "Location",
    zone: "Zone",
    status: "Status",
    progress: "Progress",
    lastCleaned: "Last Cleaned",
    recentActivity: "Recent Activity",
    cleaned: "cleaned",
    onTrack: "On Track",
    behind: "Behind",
    confirmLocation: "Confirm Location",
    scannedCodeFor: "Scanned Location:",
    completeTask: "Complete Task",
    cancel: "Cancel",
    loggedInAs: "Logged in as",
    tapToScan: "Simulate Scan (Tap)",
    realScan: "Enable Camera Scan",
    stopCamera: "Stop Camera",
    scanInstruction: "Tap below to simulate, or use 'Enable Camera Scan' to use your real camera.",
    scanFooter: "Scan QR Code at location to log task",
    successCheckIn: "Checked in at",
    geminiTitle: "Gemini AI Analysis",
    printInstruction: "Press Ctrl+P (or Cmd+P) to print these labels. Cut them out and stick them at the designated locations.",
    scanError: "Scan Error or Permission Denied",
    grantPermission: "Please grant camera permissions",
  },
  zh: {
    appTitle: "保洁追踪系统",
    manager: "管理端",
    cleanerApp: "保洁员端",
    qrCodes: "打印二维码",
    reset: "重置数据",
    dailyCompliance: "今日达标率",
    activeIssues: "异常点位",
    totalCleanings: "总打卡次数",
    runAnalysis: "生成运营分析报告",
    analyzing: "正在分析数据...",
    analysisPrompt: "点击“生成运营分析报告”以获取今日清洁状况摘要。",
    liveStatus: "实时点位状态",
    search: "搜索区域...",
    location: "点位名称",
    zone: "区域",
    status: "状态",
    progress: "进度",
    lastCleaned: "上次打卡",
    recentActivity: "最近动态",
    cleaned: "已清洁",
    onTrack: "正常",
    behind: "异常/落后",
    confirmLocation: "确认打卡点位",
    scannedCodeFor: "已扫描点位：",
    completeTask: "确认打卡",
    cancel: "取消",
    loggedInAs: "当前登录",
    tapToScan: "模拟扫码 (点击)",
    realScan: "开启摄像头扫码",
    stopCamera: "关闭摄像头",
    scanInstruction: "点击下方卡片可模拟扫码，或点击“开启摄像头扫码”使用真实相机。",
    scanFooter: "到达点位后请扫描二维码打卡",
    successCheckIn: "打卡成功：",
    geminiTitle: "Gemini AI 智能分析",
    printInstruction: "请按 Ctrl+P (或 Cmd+P) 打印此页面。将二维码剪裁后张贴在对应清洁点位。",
    scanError: "扫描错误或未授权",
    grantPermission: "请允许使用摄像头",
  }
};

// Helper to generate some initial dummy logs for "today"
export const generateInitialLogs = (): CleaningLog[] => {
  const logs: CleaningLog[] = [];
  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  
  // Create some random logs for today
  LOCATIONS.forEach(loc => {
    // Randomize how many times it was cleaned (some compliant, some missing)
    const completions = Math.floor(Math.random() * (loc.targetDailyFrequency + 2)); 
    
    for (let i = 0; i < completions; i++) {
      // Distribute timestamps across the day
      const time = startOfDay + Math.random() * (now - startOfDay);
      logs.push({
        id: `log-${loc.id}-${i}`,
        locationId: loc.id,
        cleanerId: CLEANERS[Math.floor(Math.random() * CLEANERS.length)].id,
        timestamp: time,
        status: 'completed'
      });
    }
  });

  return logs.sort((a, b) => b.timestamp - a.timestamp);
};