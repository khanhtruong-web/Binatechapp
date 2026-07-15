export interface AppError {
  errorId: string;
  timestamp: string;
  userEmail: string;
  errorMessage: string;
  errorStack: string;
  diagnosticPrompt: string;
  status: 'Open' | 'Resolved';
}

/**
 * Generate a detailed diagnostic prompt for AI troubleshooting
 */
export function generateDiagnosticPrompt(
  errorMessage: string,
  errorStack: string,
  tabName: string,
  userEmail: string,
  timestamp: string
): string {
  return `[LỖI HỆ THỐNG BINATECH ERP]
- Thời gian xảy ra: ${timestamp}
- Tài khoản người dùng: ${userEmail}
- Phân hệ hoạt động: ${tabName}
- Thông điệp lỗi: ${errorMessage}

[VẾT NGĂN XẾP (STACK TRACE)]
${errorStack || 'Không có stack trace.'}

[YÊU CẦU CHO AI]
Bạn hãy đóng vai trò là một Chuyên gia Kỹ thuật và Lập trình viên cao cấp. Hãy phân tích mã lỗi trên, giải thích nguyên nhân gốc rễ và cung cấp mã nguồn (code) sửa lỗi chi tiết cho tệp tin liên quan để khắc phục triệt để lỗi này.`;
}

/**
 * Record an application error, save it locally, and sync it to Google Sheets
 */
export async function trackAppError(error: Error | any, tabName: string) {
  try {
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || '';
    const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    // Get current user info from localStorage
    let userEmail = 'unknown@binatech.com';
    try {
      const storedUser = localStorage.getItem('BINATECH_USER_INFO');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.email) userEmail = parsed.email;
      }
    } catch (e) {}

    const errorId = `ERR_${Date.now()}`;
    const diagnosticPrompt = generateDiagnosticPrompt(errorMessage, errorStack, tabName, userEmail, timestamp);

    const newError: AppError = {
      errorId,
      timestamp,
      userEmail,
      errorMessage,
      errorStack,
      diagnosticPrompt,
      status: 'Open'
    };

    // 1. Save to localStorage
    const localLogsStr = localStorage.getItem('binatech_error_logs');
    const localLogs: AppError[] = localLogsStr ? JSON.parse(localLogsStr) : [];
    localLogs.unshift(newError); // Add new error to the top
    localStorage.setItem('binatech_error_logs', JSON.stringify(localLogs.slice(0, 50))); // Keep last 50 logs

    // 2. Dispatch event to notify UI
    window.dispatchEvent(new CustomEvent('binatech-error-logged', { detail: newError }));

    // 3. Try to sync to Google Sheets (sheetName: App_Errors)
    try {
      const token = localStorage.getItem('BINATECH_GOOGLE_TOKEN');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch('/api/sheets/App_Errors', {
        method: 'POST',
        headers,
        body: JSON.stringify(newError)
      });
      console.log(`[Error Tracker] Successfully synced error ${errorId} to Google Sheets.`);
    } catch (sheetErr) {
      console.warn('[Error Tracker] Failed to sync error to Google Sheets (running offline mode).', sheetErr);
    }
  } catch (e) {
    console.error('[Error Tracker] Failed to track error:', e);
  }
}
