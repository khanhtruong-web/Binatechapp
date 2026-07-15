// ============================================================================
// Translations Dictionary — Support English & Vietnamese
// ============================================================================

export type Lang = 'en' | 'vi';

export const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  // Navigation / Sidebar
  'Dashboard': { en: 'Overview Dashboard', vi: 'Bảng Điều khiển Tổng quan' },
  'Quotation Engine': { en: 'Quotation Engine', vi: 'Động cơ Báo giá NDT' },
  'Settings': { en: 'System Settings', vi: 'Cấu hình Hệ thống' },
  'HR (Personnel)': { en: 'HR Personnel Directory', vi: 'Tuyển dụng & Nhân sự' },
  'Marketing': { en: 'Marketing & Leads', vi: 'Marketing & Đầu mối' },
  'Accounting': { en: 'Accounting & Invoices', vi: 'Kế toán & Hóa đơn' },
  'Project Control': { en: 'Project Control', vi: 'Kiểm soát Dự án' },
  'Technical Dossier': { en: 'Technical Dossiers', vi: 'Hồ sơ Kỹ thuật' },
  'Training': { en: 'Training Logs', vi: 'Nhật ký Đào tạo' },
  'Equipment': { en: 'Equipment Register', vi: 'Quản lý Thiết bị NDT' },
  'NDT Reports': { en: 'NDT Reports', vi: 'Báo cáo Kiểm tra NDT' },
  'Tender Dossier': { en: 'Tender Dossiers', vi: 'Hồ sơ Thầu' },
  
  // General UI Buttons
  'Sign Out': { en: 'Sign Out', vi: 'Đăng xuất' },
  'AI Assistant': { en: 'AI Assistant', vi: 'Trợ lý AI' },
  'Import CSV/Excel': { en: 'Import CSV/Excel', vi: 'Nhập CSV/Excel' },
  'Export Excel': { en: 'Export Excel', vi: 'Xuất Excel' },
  'New Record': { en: 'New Record', vi: 'Tạo bản ghi mới' },
  'Save to Google Sheets': { en: 'Save to Google Sheets', vi: 'Lưu vào Google Sheets' },
  'Cancel': { en: 'Cancel', vi: 'Hủy' },
  'Edit Option': { en: 'Edit Option', vi: 'Sửa bản ghi' },
  'Record Details': { en: 'Record Details', vi: 'Chi tiết Bản ghi' },
  'Edit Record': { en: 'Edit Record', vi: 'Chỉnh sửa bản ghi' },
  'Sync Google Drive Folders': { en: 'Sync Google Drive Folders', vi: 'Đồng bộ thư mục Drive' },
  
  // Login Page UI
  'Welcome Back': { en: 'Welcome Back', vi: 'Chào mừng trở lại' },
  'Sign in to continue': { en: 'Sign in to continue', vi: 'Đăng nhập để tiếp tục' },
  'Login Google': { en: 'Sign in with Google Workspace', vi: 'Đăng nhập Google Workspace' },
  'Skip Demo': { en: 'Skip / Use Demo Account', vi: 'Bỏ qua / Tài khoản Thử nghiệm' },
  'Advanced Config': { en: 'Advanced Configuration', vi: 'Cấu hình nâng cao' },
  'Save config': { en: 'Save Config & Reload', vi: 'Lưu cấu hình & Tải lại' },
  'Security Access': { en: 'Secure Internal Access', vi: 'Xác thực bảo mật nội bộ' },
  
  // HR Personnel tabs
  'CV Extraction': { en: 'CV Extraction', vi: 'Trích xuất CV' },
  'Personnel Directory': { en: 'Personnel Directory', vi: 'Danh bạ Nhân sự' },
  'Smart Search': { en: 'Smart Search', vi: 'Tìm kiếm Thông minh' },
  'AI Tools': { en: 'AI Tools', vi: 'Công cụ AI' },
  'HR Dashboard': { en: 'HR Dashboard', vi: 'Thống kê HR' },
  'Disciplines Manager': { en: 'Disciplines Manager', vi: 'Quản lý Chuyên môn' },

  // Role Badge
  'Simulated App Role': { en: 'Simulated App Role', vi: 'Vai trò giả lập' },
  'Admin (Full Access)': { en: 'Admin (Full Access)', vi: 'Quản trị viên (Toàn quyền)' },
  'Manager (No Accounting/Settings)': { en: 'Manager (No Accounting)', vi: 'Trưởng phòng (Hạn chế)' },
  'Employee (Operations Only)': { en: 'Employee (Operations Only)', vi: 'Nhân viên (Xem dữ liệu)' },
};

export const SCHEMA_FIELD_TRANSLATIONS: Record<string, Record<Lang, string>> = {
  // Marketing
  'clientId': { en: 'Client ID', vi: 'Mã khách hàng' },
  'companyName': { en: 'Company Name', vi: 'Tên công ty' },
  'industry': { en: 'Industry Sector', vi: 'Ngành công nghiệp' },
  'status': { en: 'Status', vi: 'Trạng thái' },
  'contactPerson': { en: 'Contact Person', vi: 'Người liên hệ' },
  'potentialValue': { en: 'Potential Value ($)', vi: 'Giá trị tiềm năng ($)' },
  'nextFollowUp': { en: 'Next Follow-up', vi: 'Ngày hẹn tiếp theo' },
  'meetingLogs': { en: 'Meeting Logs', vi: 'Nhật ký cuộc họp' },
  'leadSource': { en: 'Lead Source', vi: 'Nguồn khách hàng' },
  'assignedSale': { en: 'Assigned Sales Rep', vi: 'Kỹ sư bán hàng' },
  'conversionRate': { en: 'Win Probability (%)', vi: 'Tỷ lệ thắng (%)' },
  'competitors': { en: 'Competitors', vi: 'Đối thủ cạnh tranh' },
  'lostReason': { en: 'Reason Lost', vi: 'Lý do mất lead' },

  // Accounting
  'invoiceId': { en: 'Invoice ID', vi: 'Mã hóa đơn' },
  'client': { en: 'Client Name', vi: 'Tên khách hàng' },
  'projectId': { en: 'Project ID', vi: 'Mã dự án' },
  'amount': { en: 'Amount ($)', vi: 'Số tiền ($)' },
  'vatPercent': { en: 'VAT (%)', vi: 'Thuế VAT (%)' },
  'invoiceDate': { en: 'Invoice Date', vi: 'Ngày phát hành' },
  'dueDate': { en: 'Due Date', vi: 'Hạn thanh toán' },
  'paymentDate': { en: 'Payment Date', vi: 'Ngày thanh toán' },
  'opExpenses': { en: 'Operational Expenses', vi: 'Chi phí vận hành' },
  'remarks': { en: 'Remarks', vi: 'Ghi chú thêm' },
  'invoiceType': { en: 'Invoice Type', vi: 'Loại hóa đơn' },
  'paymentMethod': { en: 'Payment Method', vi: 'Hình thức thanh toán' },
  'poNumber': { en: 'Contract / PO Number', vi: 'Số PO / Hợp đồng' },
  'billingAddress': { en: 'Billing Address', vi: 'Địa chỉ xuất HĐ' },
  'taxCode': { en: 'Tax Code', vi: 'Mã số thuế' },
  'paidAmount': { en: 'Paid Amount ($)', vi: 'Đã thanh toán ($)' },
  'balanceDue': { en: 'Balance Due ($)', vi: 'Số tiền còn lại ($)' },

  // HR
  'empId': { en: 'Employee ID', vi: 'Mã nhân viên' },
  'name': { en: 'Full Name', vi: 'Họ và tên' },
  'position': { en: 'Job Position', vi: 'Vị trí công việc' },
  'certMethod': { en: 'NDT Method', vi: 'Phương pháp NDT' },
  'certLevel': { en: 'Cert Level', vi: 'Cấp độ chứng chỉ' },
  'certScheme': { en: 'Cert Scheme', vi: 'Hệ tiêu chuẩn' },
  'certExpiry': { en: 'Cert Expiry Date', vi: 'Ngày hết hạn CC' },
  'medicalExpiry': { en: 'Medical/Vision Expiry', vi: 'Hạn khám sức khỏe/thị lực' },
  'radiationSafetyExpiry': { en: 'Radiation Safety Expiry', vi: 'Hạn an toàn phóng xạ' },
  'contractEnd': { en: 'Contract End Date', vi: 'Ngày hết hạn hợp đồng' },
  'radiationCardNo': { en: 'Radiation Safety Card No.', vi: 'Số thẻ an toàn bức xạ' },
  'eyeTestDate': { en: 'Last Eye Test Date', vi: 'Ngày khám thị lực gần nhất' },
  'gender': { en: 'Gender', vi: 'Giới tính' },
  'dob': { en: 'Date of Birth', vi: 'Ngày sinh' },
  'nationalId': { en: 'National ID / Passport', vi: 'Số CCCD / Hộ chiếu' },
  'socialInsNo': { en: 'Social Insurance No.', vi: 'Mã số BHXH' },
  'bankAccount': { en: 'Bank Account No.', vi: 'Số tài khoản ngân hàng' },
  'bankName': { en: 'Bank Name', vi: 'Tên ngân hàng' },
  'baseSalary': { en: 'Base Salary ($)', vi: 'Lương cơ bản ($)' },
  'allowance': { en: 'Project Allowance ($)', vi: 'Phụ cấp dự án ($)' },

  // Project Control
  'progress': { en: 'Progress (%)', vi: 'Tiến độ (%)' },
  'startDate': { en: 'Start Date', vi: 'Ngày khởi đầu' },
  'endDate': { en: 'End Date', vi: 'Ngày kết thúc' },
  'contractNo': { en: 'Contract / PO No.', vi: 'Số hợp đồng / PO' },
  'site': { en: 'Site / Location', vi: 'Địa điểm công trường' },
  'methods': { en: 'NDT Methods', vi: 'Các phương pháp NDT' },
  'contractValue': { en: 'Contract Value ($)', vi: 'Giá trị hợp đồng ($)' },
  'personnel': { en: 'Assigned Personnel', vi: 'Nhân sự phân công' },
  'scope': { en: 'Scope of Work', vi: 'Phạm vi công việc' },
  'projectManager': { en: 'Project Manager (PM)', vi: 'Quản trị dự án (PM)' },
  'actualCost': { en: 'Actual Cost Incurred ($)', vi: 'Chi phí thực tế ($)' },
  'estMargin': { en: 'Expected Margin (%)', vi: 'Lợi nhuận dự kiến (%)' },
  'priority': { en: 'Priority', vi: 'Mức độ ưu tiên' },
  'clientFeedback': { en: 'Client Feedback', vi: 'Đánh giá từ khách hàng' },

  // Technical Dossier
  'docId': { en: 'Document ID', vi: 'Mã tài liệu' },
  'title': { en: 'Document Title', vi: 'Tiêu đề tài liệu' },
  'type': { en: 'Document Type', vi: 'Loại tài liệu' },
  'standard': { en: 'Applied Standard', vi: 'Tiêu chuẩn áp dụng' },
  'revision': { en: 'Revision No.', vi: 'Số hiệu soát xét' },
  'approvedBy': { en: 'Approved By (Level III)', vi: 'Người phê duyệt (Level III)' },
  'issueDate': { en: 'Issue Date', vi: 'Ngày ban hành' },
  'preparedBy': { en: 'Prepared By', vi: 'Người soạn thảo' },
  'reviewedBy': { en: 'Reviewed By', vi: 'Người kiểm tra' },
  'applicableScope': { en: 'Applicable Scope', vi: 'Phạm vi áp dụng' },
  'nextReviewDate': { en: 'Next Audit Review', vi: 'Hạn soát xét định kỳ' },
  'isConfidential': { en: 'Confidentiality Level', vi: 'Mức độ bảo mật' },
  'driveLink': { en: 'Drive Document Link', vi: 'Đường dẫn Drive file' },

  // Training
  'logId': { en: 'Log ID', vi: 'Mã nhật ký' },
  'course': { en: 'Course Name', vi: 'Tên khóa đào tạo' },
  'provider': { en: 'Training Provider', vi: 'Đơn vị đào tạo' },
  'hours': { en: 'Hours Tracked', vi: 'Số giờ đào tạo' },
  'certificate': { en: 'Certificate Drive Link', vi: 'Liên kết chứng chỉ Drive' },
  'cost': { en: 'Training Cost ($)', vi: 'Chi phí đào tạo ($)' },
  'instructor': { en: 'Instructor / Trainer', vi: 'Giáo viên hướng dẫn' },
  'score': { en: 'Exam Score', vi: 'Điểm sát hạch' },
  'sponsor': { en: 'Sponsorship', vi: 'Đơn vị tài trợ' },

  // Equipment
  'tagNo': { en: 'Tag No. (ID)', vi: 'Số thẻ thiết bị (Tag)' },
  'nameName': { en: 'Equipment Name', vi: 'Tên thiết bị' },
  'nextCal': { en: 'Next Cal. Due', vi: 'Ngày hiệu chuẩn tiếp theo' },
  'manufacturer': { en: 'Manufacturer', vi: 'Nhà sản xuất' },
  'model': { en: 'Model / Brand', vi: 'Model thiết bị' },
  'serialNo': { en: 'Serial Number', vi: 'Số Seri' },
  'calDate': { en: 'Calibration Date', vi: 'Ngày hiệu chuẩn gần nhất' },
  'calCertNo': { en: 'Cal. Certificate No.', vi: 'Số chứng chỉ hiệu chuẩn' },
  'calAgency': { en: 'Calibration Agency', vi: 'Cơ quan hiệu chuẩn' },
  'location': { en: 'Location / Custodian', vi: 'Vị trí / Người giữ' },
  'maintenanceLog': { en: 'Maintenance Log', vi: 'Nhật ký bảo dưỡng' },
  'isotopeSource': { en: 'Isotope Source Type', vi: 'Nguồn phóng xạ đồng vị' },
  'sourceActivity': { en: 'Source Activity (Ci)', vi: 'Hoạt độ phóng xạ (Curie)' },
  'purchaseDate': { en: 'Purchase Date', vi: 'Ngày mua thiết bị' },
  'purchaseValue': { en: 'Purchase Value ($)', vi: 'Giá trị mua ($)' },
  'depreciationYears': { en: 'Depreciation (Years)', vi: 'Khấu hao (Năm)' },
  'lastMaintenanceDate': { en: 'Last Service Date', vi: 'Ngày bảo dưỡng gần nhất' },
  'isRadiationHazard': { en: 'Radiation Safety Hazard', vi: 'Nguy cơ phóng xạ' },
  'storageLocation': { en: 'Storage Warehouse', vi: 'Kho lưu trữ' },

  // NDT Reports
  'reportNo': { en: 'Report Number', vi: 'Số báo cáo NDT' },
  'jointNo': { en: 'Joint / Weld No.', vi: 'Số mối hàn' },
  'method': { en: 'Method', vi: 'Phương pháp' },
  'result': { en: 'Result / Assessment', vi: 'Đánh giá kết quả' },
  'drawingNo': { en: 'Drawing / ISO No.', vi: 'Số bản vẽ isometric' },
  'welderId': { en: 'Welder ID', vi: 'Mã thợ hàn' },
  'wpsNo': { en: 'WPS No.', vi: 'Số quy trình hàn (WPS)' },
  'material': { en: 'Material Specification', vi: 'Mác vật liệu' },
  'thickness': { en: 'Thickness (mm)', vi: 'Chiều dày (mm)' },
  'diameter': { en: 'Diameter (NPS/OD)', vi: 'Đường kính mối hàn' },
  'procedureNo': { en: 'NDT Procedure No.', vi: 'Số quy trình NDT' },
  'acceptanceCriteria': { en: 'Acceptance Criteria', vi: 'Tiêu chuẩn nghiệm thu' },
  'defectType': { en: 'Defect Indication', vi: 'Loại khuyết tật phát hiện' },
  'defectLocation': { en: 'Defect Location', vi: 'Vị trí khuyết tật' },
  'repairStatus': { en: 'Repair Status', vi: 'Trạng thái sửa chữa' },
  'testDate': { en: 'Inspection Date', vi: 'Ngày kiểm tra' },
  'inspectorId': { en: 'Inspector ID', vi: 'Mã giám định viên' },
  'welderName': { en: 'Welder Full Name', vi: 'Họ tên thợ hàn' },
  'segmentNo': { en: 'Inspection Segment', vi: 'Phân đoạn kiểm tra' },
  'sensitivity': { en: 'Inspection Sensitivity (%)', vi: 'Độ nhạy kiểm tra (%)' },
  'filmSize': { en: 'Film / Probe Specification', vi: 'Quy cách phim / Đầu dò' },
  'reviewStatus': { en: 'Review Status', vi: 'Trạng thái duyệt báo cáo' },

  // Tender Dossier
  'tenderId': { en: 'Tender ID', vi: 'Mã hồ sơ thầu' },
  'projectName': { en: 'Project Name', vi: 'Tên dự án thầu' },
  'deadline': { en: 'Submission Deadline', vi: 'Hạn nộp thầu' },
  'submissionDate': { en: 'Submission Date', vi: 'Ngày nộp thầu thực tế' },
  'bidValue': { en: 'Bid Value ($)', vi: 'Giá trị bỏ thầu ($)' },
  'techMatrix': { en: 'Technical Matrix Link', vi: 'Ma trận kỹ thuật thầu' },
  'commMatrix': { en: 'Commercial Matrix Link', vi: 'Ma trận thương mại thầu' },
  'assignedTenderPM': { en: 'Assigned Tender PM', vi: 'Trưởng nhóm thầu' },
  'bondValue': { en: 'Bid Bond Value ($)', vi: 'Tiền bảo lãnh dự thầu ($)' },
  'wonLostDate': { en: 'Award Announcement Date', vi: 'Ngày công bố kết quả' },
  'competitorBids': { en: 'Competitor Bids Details', vi: 'Báo giá của đối thủ' },
};

/** Translate string helper */
export function t(key: string, lang: Lang): string {
  return TRANSLATIONS[key]?.[lang] || SCHEMA_FIELD_TRANSLATIONS[key]?.[lang] || key;
}

import { ModuleSchema } from './types';

export function localizeSchema(schema: ModuleSchema, lang: Lang): ModuleSchema {
  if (!schema) return schema;
  const fields = schema.fields.map(f => {
    // Translate the label based on field name
    const translatedLabel = SCHEMA_FIELD_TRANSLATIONS[f.name]?.[lang] || f.label;
    
    // Translate standard options if present
    let translatedOptions = f.options;
    if (f.options && lang === 'vi') {
      translatedOptions = f.options.map(opt => {
        // Marketing Lead Status & Source / Lost Reason
        if (opt === 'Cold') return 'Lạnh (Cold)';
        if (opt === 'Warm') return 'Ấm (Warm)';
        if (opt === 'Hot') return 'Nóng (Hot)';
        if (opt === 'Converted') return 'Đã chốt (Converted)';
        if (opt === 'Website') return 'Trang web';
        if (opt === 'Referral') return 'Giới thiệu';
        if (opt === 'Exhibition') return 'Hội chợ/Triển lãm';
        if (opt === 'Direct Call') return 'Gọi trực tiếp';
        if (opt === 'Email Campaign') return 'Chiến dịch Email';
        if (opt === 'Price Too High') return 'Giá quá cao';
        if (opt === 'Competitor Won') return 'Đối thủ thắng';
        if (opt === 'No Response') return 'Không phản hồi';
        if (opt === 'Project Cancelled') return 'Dự án hủy bỏ';

        // Accounting Invoice
        if (opt === 'Pending') return 'Chờ xử lý';
        if (opt === 'Paid') return 'Đã thanh toán';
        if (opt === 'Partially Paid') return 'Thanh toán một phần';
        if (opt === 'Overdue') return 'Quá hạn';
        if (opt === 'Revenue/Receipt') return 'Doanh thu/Thu tiền';
        if (opt === 'Expense/Payment') return 'Chi phí/Chi tiền';
        if (opt === 'Internal Transfer') return 'Chuyển khoản nội bộ';
        if (opt === 'Bank Transfer') return 'Chuyển khoản ngân hàng';
        if (opt === 'Cash') return 'Tiền mặt';
        if (opt === 'Credit Card') return 'Thẻ tín dụng';

        // Project Status & Priority
        if (opt === 'Planned') return 'Đã lập kế hoạch';
        if (opt === 'Ongoing') return 'Đang thực hiện';
        if (opt === 'On Hold') return 'Tạm dừng';
        if (opt === 'Completed') return 'Đã hoàn thành';
        if (opt === 'Closed') return 'Đã đóng';
        if (opt === 'Low') return 'Thấp';
        if (opt === 'Medium') return 'Trung bình';
        if (opt === 'High') return 'Cao';
        if (opt === 'Urgent') return 'Khẩn cấp';
        if (opt === 'Excellent') return 'Xuất sắc';
        if (opt === 'Good') return 'Tốt';
        if (opt === 'Fair') return 'Trung bình';
        if (opt === 'Poor') return 'Kém';

        // Equipment status & Radiation safety
        if (opt === 'Active') return 'Hoạt động';
        if (opt === 'Expiring Soon') return 'Sắp hết hạn';
        if (opt === 'Out of Service') return 'Dừng hoạt động';
        if (opt === 'In Repair') return 'Đang sửa chữa';
        if (opt === 'Yes') return 'Có nguy hại';
        if (opt === 'No') return 'Không nguy hại';

        // NDT Reports & Technical Dossier
        if (opt === 'Accept') return 'Đạt (Accept)';
        if (opt === 'Reject') return 'Không đạt (Reject)';
        if (opt === 'Draft') return 'Bản nháp';
        if (opt === 'For Review') return 'Chờ duyệt';
        if (opt === 'Approved') return 'Đã duyệt';
        if (opt === 'Obsolete') return 'Hết hiệu lực';
        if (opt === 'Checked by Inspector') return 'KTV đã kiểm tra';
        if (opt === 'Approved by Level III') return 'Level III phê duyệt';

        // Technical Dossier Confidentiality
        if (opt === 'Public') return 'Công khai';
        if (opt === 'Partner Shared') return 'Chia sẻ đối tác';
        if (opt === 'Strictly Internal') return 'Bảo mật nội bộ';

        // Training result & sponsorship
        if (opt === 'Pass') return 'Đạt (Pass)';
        if (opt === 'Fail') return 'Trượt (Fail)';
        if (opt === 'Attended') return 'Đã tham gia';
        if (opt === 'Company Sponsored') return 'Công ty tài trợ';
        if (opt === 'Self Sponsored') return 'Nhân viên tự túc';

        return opt;
      });
    }
    
    return {
      ...f,
      label: translatedLabel,
      options: translatedOptions
    };
  });
  
  return {
    ...schema,
    name: TRANSLATIONS[schema.id]?.[lang] || schema.name,
    fields
  };
}
