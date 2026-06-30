<?php
// app/Services/EmployeeImportExportService.php

namespace App\Services;

use App\Models\Employee;
use App\Models\Department;
use App\Models\Position;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Exception;

class EmployeeImportExportService
{
    protected array $employmentTypes = ['full_time', 'part_time', 'contract', 'intern'];
    protected array $statusTypes = ['active', 'inactive', 'suspended', 'terminated', 'resigned'];
    protected array $employmentStatusTypes = ['probation', 'permanent', 'contract'];
    protected array $genderTypes = ['male', 'female', 'other'];
    protected array $cardTypes = ['RFID', 'NFC', 'Barcode', 'QR'];
    protected array $statusColors = [
        'active' => 'C6EFCE',
        'inactive' => 'FFC7CE',
        'suspended' => 'FFEB9C',
        'terminated' => 'FFC7CE',
        'resigned' => 'FFEB9C',
    ];

    /**
     * CREATE TEMPLATE
     */
    public function createTemplate(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Employee Template');

        $headers = [
            'A1' => 'First Name*',
            'B1' => 'Last Name*',
            'C1' => 'Email*',
            'D1' => 'Password*',
            'E1' => 'Phone',
            'F1' => 'Date of Birth (YYYY-MM-DD)',
            'G1' => 'Gender',
            'H1' => 'National ID',
            'I1' => 'Address',
            'J1' => 'Hire Date (YYYY-MM-DD)*',
            'K1' => 'Probation End Date (YYYY-MM-DD)',
            'L1' => 'Department*',
            'M1' => 'Position*',
            'N1' => 'Default Office',
            'O1' => 'Employment Type*',
            'P1' => 'Status*',
            'Q1' => 'Employment Status',
            'R1' => 'Salary',
            'S1' => 'Manager Email',
            'T1' => 'Emergency Contact Name',
            'U1' => 'Emergency Contact Phone',
            'V1' => 'Emergency Contact Relation',
            'W1' => 'Card Number',
            'X1' => 'Card Type',
            'Y1' => 'Use Card (YES/NO)',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A73E8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]],
        ];
        $sheet->getStyle('A1:Y1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(30);

        // Example data with VALID dates
        $exampleData = [
            'John',
            'Doe',
            'john.doe@company.com',
            'password123',
            '08123456789',
            '1990-01-15',
            'male',
            '1234567890',
            'Jl. Example No. 123',
            date('Y-m-d'),
            date('Y-m-d', strtotime('+3 months')),
            'Information Technology',
            'Senior Developer',
            'Head Office',
            'full_time',
            'active',
            'permanent',
            '5000000',
            'manager@company.com',
            'Jane Doe',
            '08129876543',
            'Spouse',
            '',
            'RFID',
            'NO'
        ];

        $col = 'A';
        foreach ($exampleData as $value) {
            $sheet->setCellValue($col . '2', $value);
            $col++;
        }

        $this->addDataValidation($sheet);

        foreach (range('A', 'Y') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        $sheet->getColumnDimension('I')->setWidth(40);
        $sheet->getColumnDimension('Y')->setWidth(15);

        $this->addInstructionSheet($spreadsheet);

        return $spreadsheet;
    }

    protected function addDataValidation($sheet): void
    {
        $this->addDropdownValidation($sheet, 'G', $this->genderTypes);
        $this->addDropdownValidation($sheet, 'O', $this->employmentTypes);
        $this->addDropdownValidation($sheet, 'P', $this->statusTypes);
        $this->addDropdownValidation($sheet, 'Q', $this->employmentStatusTypes);
        $this->addDropdownValidation($sheet, 'X', $this->cardTypes);
        $this->addDropdownValidation($sheet, 'Y', ['YES', 'NO']);
    }

    protected function addDropdownValidation($sheet, string $column, array $options): void
    {
        $validation = $sheet->getDataValidation($column . '2:' . $column . '1000');
        $validation->setType(DataValidation::TYPE_LIST);
        $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
        $validation->setAllowBlank(true);
        $validation->setShowInputMessage(true);
        $validation->setShowErrorMessage(true);
        $validation->setShowDropDown(true);
        $validation->setFormula1('"' . implode(',', $options) . '"');
    }

    protected function addInstructionSheet(Spreadsheet $spreadsheet): void
    {
        $instructionSheet = $spreadsheet->createSheet();
        $instructionSheet->setTitle('Instructions');

        $instructions = [
            ['📋 EMPLOYEE IMPORT INSTRUCTIONS'],
            [''],
            ['📌 REQUIRED FIELDS (marked with *):'],
            ['   • First Name, Last Name, Email, Password, Hire Date, Department, Position, Employment Type, Status'],
            [''],
            ['📌 FIELD DESCRIPTIONS:'],
            ['   • First Name: Employee first name'],
            ['   • Last Name: Employee last name'],
            ['   • Email: Must be unique and valid email format'],
            ['   • Password: Minimum 8 characters (will be hashed)'],
            ['   • Phone: Contact phone number'],
            ['   • Date of Birth: Format YYYY-MM-DD (e.g., 1990-01-15)'],
            ['   • Gender: male, female, other'],
            ['   • National ID: Unique identification number'],
            ['   • Address: Full address'],
            ['   • Hire Date: Date of joining (YYYY-MM-DD)'],
            ['   • Probation End Date: End of probation period (YYYY-MM-DD)'],
            ['   • Department: Will be auto-created if not exist'],
            ['   • Position: Will be auto-created if not exist'],
            ['   • Default Office: Office location'],
            ['   • Employment Type: ' . implode(', ', $this->employmentTypes)],
            ['   • Status: ' . implode(', ', $this->statusTypes)],
            ['   • Employment Status: ' . implode(', ', $this->employmentStatusTypes)],
            ['   • Salary: Monthly salary in numeric format'],
            ['   • Manager Email: Email of the manager (must exist)'],
            ['   • Emergency Contact: Name, Phone, Relation'],
            ['   • Card Number: Access card number (auto-generated if empty)'],
            ['   • Card Type: ' . implode(', ', $this->cardTypes)],
            ['   • Use Card: YES or NO'],
            [''],
            ['📌 IMPORTANT:'],
            ['   • Department and Position will be auto-created if not exist'],
            ['   • Employee ID will be auto-generated (EMP-YYYY-XXXX)'],
            ['   • Card Number will be auto-generated if left empty and Use Card is YES'],
            ['   • Do not modify the header row'],
            ['   • Maximum file size: 10MB'],
            ['   • Supported formats: .xlsx, .xls, .csv'],
            ['   • Date format MUST be YYYY-MM-DD (e.g., 2024-01-15)'],
            [''],
            ['📌 EXAMPLE:'],
            ['   • Row 2 shows example data - you can replace it with your data'],
            ['   • Delete row 2 before importing your actual data'],
        ];

        $row = 1;
        foreach ($instructions as $instruction) {
            $instructionSheet->setCellValue('A' . $row, $instruction[0]);
            if ($row === 1) {
                $instructionSheet->getStyle('A' . $row)
                    ->getFont()
                    ->setBold(true)
                    ->setSize(16)
                    ->setColor(new Color('1A73E8'));
            }
            $row++;
        }
        $instructionSheet->getColumnDimension('A')->setWidth(80);
    }

    /**
     * PROCESS IMPORT - COMPLETE FIX
     */
    public function processImport(UploadedFile $file): array
    {
        Log::info('📤 Starting employee import...');

        try {
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file);
        } catch (\Exception $e) {
            Log::error('❌ Failed to load file: ' . $e->getMessage());
            return [
                'success_count' => 0,
                'fail_count' => 1,
                'errors' => ['Failed to read file: ' . $e->getMessage()]
            ];
        }

        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();

        if (empty($rows) || count($rows) < 2) {
            return [
                'success_count' => 0,
                'fail_count' => 1,
                'errors' => ['File is empty. Please fill in the data.']
            ];
        }

        // Remove header
        $header = array_shift($rows);
        Log::info('📋 Header row:', $header);

        $successCount = 0;
        $failCount = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            try {
                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                // Ensure row has enough columns
                $row = array_pad($row, 25, '');

                $data = [
                    'first_name' => trim($row[0] ?? ''),
                    'last_name' => trim($row[1] ?? ''),
                    'email' => trim($row[2] ?? ''),
                    'password' => trim($row[3] ?? ''),
                    'phone' => trim($row[4] ?? ''),
                    'date_of_birth' => trim($row[5] ?? ''),
                    'gender' => trim($row[6] ?? ''),
                    'national_id' => trim($row[7] ?? ''),
                    'address' => trim($row[8] ?? ''),
                    'hire_date' => trim($row[9] ?? ''),
                    'probation_end_date' => trim($row[10] ?? ''),
                    'department' => trim($row[11] ?? ''),
                    'position' => trim($row[12] ?? ''),
                    'default_office' => trim($row[13] ?? ''),
                    'employment_type' => trim($row[14] ?? 'full_time'),
                    'status' => trim($row[15] ?? 'active'),
                    'employment_status' => trim($row[16] ?? 'probation'),
                    'salary' => trim($row[17] ?? 0),
                    'manager_email' => trim($row[18] ?? ''),
                    'emergency_contact_name' => trim($row[19] ?? ''),
                    'emergency_contact_phone' => trim($row[20] ?? ''),
                    'emergency_contact_relation' => trim($row[21] ?? ''),
                    'card_number' => trim($row[22] ?? ''),
                    'card_type' => trim($row[23] ?? 'RFID'),
                    'use_card' => strtoupper(trim($row[24] ?? 'NO')) === 'YES',
                ];

                Log::info('📝 Row ' . ($index + 2) . ' data:', $data);

                // VALIDATION
                $validationResult = $this->validateRowData($data, $index);
                if (!$validationResult['valid']) {
                    $errors = array_merge($errors, $validationResult['errors']);
                    $failCount++;
                    continue;
                }

                // PROCESS
                $result = $this->createEmployeeFromData($data);
                if ($result['success']) {
                    $successCount++;
                    Log::info('✅ Row ' . ($index + 2) . ' imported successfully');
                } else {
                    $failCount++;
                    $errors[] = "Row " . ($index + 2) . ": " . $result['message'];
                    Log::error('❌ Row ' . ($index + 2) . ' failed: ' . $result['message']);
                }
            } catch (\Exception $e) {
                $failCount++;
                $errors[] = "Row " . ($index + 2) . ": " . $e->getMessage();
                Log::error('❌ Row ' . ($index + 2) . ' error: ' . $e->getMessage());
            }
        }

        Log::info('✅ Import completed - Success: ' . $successCount . ', Failed: ' . $failCount);

        return [
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'errors' => $errors,
        ];
    }

    /**
     * VALIDATE ROW DATA - COMPLETE FIX
     */
    protected function validateRowData(array $data, int $index): array
    {
        $errors = [];
        $valid = true;

        // Check required fields
        $requiredFields = ['first_name', 'last_name', 'email', 'password', 'hire_date', 'department', 'position'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                $errors[] = "Row " . ($index + 2) . ": " . ucfirst(str_replace('_', ' ', $field)) . " is required";
                $valid = false;
            }
        }

        // Validate email
        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = "Row " . ($index + 2) . ": Invalid email format";
            $valid = false;
        }

        // Check if employee already exists
        if (!empty($data['email']) && Employee::where('email', $data['email'])->exists()) {
            $errors[] = "Row " . ($index + 2) . ": Employee with email '{$data['email']}' already exists";
            $valid = false;
        }

        // Validate password length
        if (!empty($data['password']) && strlen($data['password']) < 8) {
            $errors[] = "Row " . ($index + 2) . ": Password must be at least 8 characters";
            $valid = false;
        }

        // Validate employment type
        if (!empty($data['employment_type']) && !in_array($data['employment_type'], $this->employmentTypes)) {
            $errors[] = "Row " . ($index + 2) . ": Invalid employment type '{$data['employment_type']}'. Valid: " . implode(', ', $this->employmentTypes);
            $valid = false;
        }

        // Validate status
        if (!empty($data['status']) && !in_array($data['status'], $this->statusTypes)) {
            $errors[] = "Row " . ($index + 2) . ": Invalid status '{$data['status']}'. Valid: " . implode(', ', $this->statusTypes);
            $valid = false;
        }

        // Validate employment status
        if (!empty($data['employment_status']) && !in_array($data['employment_status'], $this->employmentStatusTypes)) {
            $errors[] = "Row " . ($index + 2) . ": Invalid employment status '{$data['employment_status']}'. Valid: " . implode(', ', $this->employmentStatusTypes);
            $valid = false;
        }

        // Validate gender
        if (!empty($data['gender']) && !in_array($data['gender'], $this->genderTypes)) {
            $errors[] = "Row " . ($index + 2) . ": Invalid gender '{$data['gender']}'. Valid: " . implode(', ', $this->genderTypes);
            $valid = false;
        }

        // Validate card type
        if (!empty($data['card_type']) && !in_array($data['card_type'], $this->cardTypes)) {
            $errors[] = "Row " . ($index + 2) . ": Invalid card type '{$data['card_type']}'. Valid: " . implode(', ', $this->cardTypes);
            $valid = false;
        }

        // Validate date formats - COMPLETE FIX
        $dateFields = ['hire_date', 'date_of_birth', 'probation_end_date'];
        foreach ($dateFields as $field) {
            if (!empty($data[$field])) {
                // Check format YYYY-MM-DD
                $date = \DateTime::createFromFormat('Y-m-d', $data[$field]);
                if (!$date || $date->format('Y-m-d') !== $data[$field]) {
                    $errors[] = "Row " . ($index + 2) . ": Invalid date format for " . ucfirst(str_replace('_', ' ', $field)) . " '{$data[$field]}'. Use YYYY-MM-DD";
                    $valid = false;
                } else {
                    // Check if date is valid (e.g., no 31 June)
                    $checkDate = date_parse($data[$field]);
                    if ($checkDate['error_count'] > 0) {
                        $errors[] = "Row " . ($index + 2) . ": Invalid date '{$data[$field]}'. Please check the date.";
                        $valid = false;
                    }
                }
            }
        }

        // Validate salary is numeric
        if (!empty($data['salary']) && !is_numeric($data['salary'])) {
            $errors[] = "Row " . ($index + 2) . ": Salary must be a number";
            $valid = false;
        }

        return [
            'valid' => $valid,
            'errors' => $errors,
        ];
    }

    /**
     * CREATE EMPLOYEE FROM DATA - COMPLETE FIX
     */
    protected function createEmployeeFromData(array $data): array
    {
        try {
            DB::beginTransaction();

            // 1. FIND OR CREATE DEPARTMENT - FIX DUPLICATE
            $department = Department::where('name', $data['department'])->first();

            if (!$department) {
                $baseCode = strtoupper(substr($data['department'], 0, 3));
                $code = $baseCode;
                $counter = 1;

                // Ensure unique code
                while (Department::where('code', $code)->exists()) {
                    $code = $baseCode . $counter;
                    $counter++;
                }

                $department = Department::create([
                    'name' => $data['department'],
                    'code' => $code
                ]);
                Log::info('✅ Created new department: ' . $department->name);
            } else {
                Log::info('✅ Using existing department: ' . $department->name);
            }

            // 2. FIND OR CREATE POSITION
            $position = Position::where('title', $data['position'])->first();

            if (!$position) {
                $position = Position::create([
                    'title' => $data['position'],
                    'department_id' => $department->id
                ]);
                Log::info('✅ Created new position: ' . $position->title);
            } else {
                Log::info('✅ Using existing position: ' . $position->title);
            }

            // 3. FIND MANAGER
            $managerId = null;
            if (!empty($data['manager_email'])) {
                $manager = Employee::where('email', $data['manager_email'])->first();
                if ($manager) {
                    $managerId = $manager->id;
                    Log::info('✅ Found manager: ' . $manager->email);
                } else {
                    Log::warning('⚠️ Manager not found: ' . $data['manager_email']);
                }
            }

            // 4. GENERATE EMPLOYEE ID
            $employeeId = $this->generateEmployeeId($department->id);
            Log::info('✅ Generated employee ID: ' . $employeeId);

            // 5. GENERATE CARD NUMBER
            $cardNumber = $data['card_number'];
            if (empty($cardNumber) && $data['use_card']) {
                $cardNumber = $this->generateCardNumber($employeeId);
            }

            // 6. CREATE EMPLOYEE
            $employee = Employee::create([
                'employee_id' => $employeeId,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'password' => \Illuminate\Support\Facades\Hash::make($data['password']),
                'phone' => $data['phone'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'gender' => $data['gender'] ?? null,
                'national_id' => $data['national_id'] ?? null,
                'address' => $data['address'] ?? null,
                'hire_date' => $data['hire_date'],
                'probation_end_date' => $data['probation_end_date'] ?? null,
                'department_id' => $department->id,
                'position_id' => $position->id,
                'employment_type' => $data['employment_type'],
                'status' => $data['status'],
                'employment_status' => $data['employment_status'] ?? 'probation',
                'salary' => floatval($data['salary'] ?? 0),
                'manager_id' => $managerId,
                'emergency_contact_name' => $data['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
                'emergency_contact_relation' => $data['emergency_contact_relation'] ?? null,
                'card_number' => $cardNumber,
                'card_type' => $data['card_type'] ?? 'RFID',
                'use_card' => $data['use_card'] ?? false,
            ]);

            DB::commit();

            Log::info('✅ Employee created: ' . $employee->id . ' - ' . $employee->first_name . ' ' . $employee->last_name);

            return [
                'success' => true,
                'employee' => $employee,
                'message' => 'Employee created successfully',
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Failed to create employee: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * GENERATE EMPLOYEE ID
     */
    public function generateEmployeeId(?int $departmentId = null): string
    {
        $year = date('Y');
        $deptCode = 'EMP';

        if ($departmentId) {
            $department = Department::find($departmentId);
            if ($department) {
                $deptCode = strtoupper(substr($department->code ?? $department->name, 0, 3));
            }
        }

        $prefix = $deptCode . '-' . $year . '-';
        $lastEmployee = Employee::where('employee_id', 'like', $prefix . '%')
            ->orderBy('employee_id', 'desc')
            ->first();

        $newNumber = $lastEmployee ? intval(substr($lastEmployee->employee_id, -4)) + 1 : 1;

        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * GENERATE CARD NUMBER
     */
    public function generateCardNumber(string $employeeId): string
    {
        return 'CARD-' . str_pad(substr($employeeId, -4), 4, '0', STR_PAD_LEFT) . '-' . date('Y');
    }

    /**
     * CREATE EXPORT
     */
    public function createExport($employees, array $filters = []): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Employees');

        // Title
        $sheet->mergeCells('A1:K1');
        $sheet->setCellValue('A1', 'EMPLOYEE LIST REPORT');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1A73E8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Filter info
        $row = 3;
        $filterTexts = [];
        if (!empty($filters['start_date']) || !empty($filters['end_date'])) {
            $filterTexts[] = 'Period: ' . ($filters['start_date'] ?? '...') . ' → ' . ($filters['end_date'] ?? '...');
        }
        if (!empty($filters['status'])) {
            $filterTexts[] = 'Status: ' . ucfirst($filters['status']);
        }
        if (!empty($filters['employment_type'])) {
            $filterTexts[] = 'Type: ' . str_replace('_', ' ', $filters['employment_type']);
        }
        if (!empty($filterTexts)) {
            $sheet->mergeCells("A{$row}:K{$row}");
            $sheet->setCellValue("A{$row}", 'Filters: ' . implode(' | ', $filterTexts));
            $sheet->getStyle("A{$row}")->getFont()->setItalic(true)->setSize(10)->setColor(new Color('666666'));
            $row++;
        }

        // Export info
        $sheet->mergeCells("A{$row}:K{$row}");
        $sheet->setCellValue("A{$row}", 'Exported: ' . now()->format('d M Y H:i') . ' | Total: ' . $employees->count());
        $sheet->getStyle("A{$row}")->getFont()->setSize(9)->setColor(new Color('999999'));
        $row += 2;

        // Headers
        $headers = [
            'A' => 'No',
            'B' => 'Employee ID',
            'C' => 'First Name',
            'D' => 'Last Name',
            'E' => 'Email',
            'F' => 'Phone',
            'G' => 'Department',
            'H' => 'Position',
            'I' => 'Employment Type',
            'J' => 'Status',
            'K' => 'Hire Date',
        ];

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A73E8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]],
        ];

        foreach ($headers as $col => $header) {
            $sheet->setCellValue($col . $row, $header);
            $sheet->getStyle($col . $row)->applyFromArray($headerStyle);
        }
        $sheet->getRowDimension($row)->setRowHeight(22);
        $row++;

        // Data
        foreach ($employees as $index => $employee) {
            $sheet->setCellValue('A' . $row, $index + 1);
            $sheet->setCellValue('B' . $row, $employee->employee_id);
            $sheet->setCellValue('C' . $row, $employee->first_name);
            $sheet->setCellValue('D' . $row, $employee->last_name);
            $sheet->setCellValue('E' . $row, $employee->email);
            $sheet->setCellValue('F' . $row, $employee->phone ?? '-');
            $sheet->setCellValue('G' . $row, $employee->department->name ?? '-');
            $sheet->setCellValue('H' . $row, $employee->position->title ?? '-');
            $sheet->setCellValue('I' . $row, str_replace('_', ' ', $employee->employment_type ?? '-'));
            $sheet->setCellValue('J' . $row, ucfirst($employee->status ?? '-'));
            $sheet->setCellValue('K' . $row, $employee->hire_date ? date('d M Y', strtotime($employee->hire_date)) : '-');

            if (isset($this->statusColors[$employee->status])) {
                $sheet->getStyle('J' . $row)->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $this->statusColors[$employee->status]]]
                ]);
            }

            $sheet->getRowDimension($row)->setRowHeight(18);
            $row++;
        }

        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $spreadsheet;
    }

    /**
     * SAVE SPREADSHEET
     */
    public function saveSpreadsheet(Spreadsheet $spreadsheet, string $fileName): string
    {
        $tempDir = storage_path('app/temp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $filePath = $tempDir . '/' . $fileName;
        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * GET FILE NAMES
     */
    public function getExportFileName(string $prefix = 'Employees'): string
    {
        return $prefix . '_Export_' . now()->format('Ymd_His') . '.xlsx';
    }

    public function getTemplateFileName(): string
    {
        return 'Employee_Import_Template.xlsx';
    }

    /**
     * VALIDATE IMPORT FILE
     */
    public function validateImportFile(UploadedFile $file): array
    {
        $validator = Validator::make(['file' => $file], [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240'
        ]);

        if ($validator->fails()) {
            return [
                'valid' => false,
                'message' => 'Invalid file: ' . $validator->errors()->first()
            ];
        }

        return [
            'valid' => true,
            'message' => 'File is valid'
        ];
    }
}
