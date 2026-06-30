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
    /**
     * Valid employment types - sesuai dengan EMPLOYMENT_TYPE_OPTIONS di frontend
     */
    protected array $employmentTypes = ['full_time', 'part_time', 'contract', 'intern'];

    /**
     * Valid status types - sesuai dengan STATUS_OPTIONS di frontend
     */
    protected array $statusTypes = ['active', 'inactive', 'suspended', 'terminated', 'resigned'];

    /**
     * Valid employment status - sesuai dengan EMPLOYMENT_STATUS_OPTIONS di frontend
     */
    protected array $employmentStatusTypes = ['probation', 'permanent', 'contract'];

    /**
     * Valid gender types
     */
    protected array $genderTypes = ['male', 'female', 'other'];

    /**
     * Valid card types
     */
    protected array $cardTypes = ['RFID', 'NFC', 'Barcode', 'QR'];

    /**
     * Status colors for Excel
     */
    protected array $statusColors = [
        'active' => 'C6EFCE',
        'inactive' => 'FFC7CE',
        'suspended' => 'FFEB9C',
        'terminated' => 'FFC7CE',
        'resigned' => 'FFEB9C',
    ];

    /**
     * Create import template spreadsheet - SESUAI DENGAN FORM CREATE
     */
    public function createTemplate(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Employee Template');

        // Headers - SESUAI DENGAN FIELD DI FORM CREATE
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

        // Style headers
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A73E8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]],
        ];
        $sheet->getStyle('A1:Y1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(30);

        // Example data - SESUAI DENGAN FORM CREATE
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
            'IT',
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
            'CARD-001',
            'RFID',
            'YES'
        ];

        $col = 'A';
        foreach ($exampleData as $value) {
            $sheet->setCellValue($col . '2', $value);
            $col++;
        }

        // Add data validation for dropdowns
        $this->addDataValidation($sheet);

        // Auto-size columns
        foreach (range('A', 'Y') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Set column width for long text
        $sheet->getColumnDimension('I')->setWidth(40); // Address
        $sheet->getColumnDimension('Y')->setWidth(15); // Use Card

        // Add instruction sheet
        $this->addInstructionSheet($spreadsheet);

        return $spreadsheet;
    }

    /**
     * Add data validation to sheet
     */
    protected function addDataValidation($sheet): void
    {
        // Column G (Gender)
        $this->addDropdownValidation($sheet, 'G', $this->genderTypes);

        // Column O (Employment Type)
        $this->addDropdownValidation($sheet, 'O', $this->employmentTypes);

        // Column P (Status)
        $this->addDropdownValidation($sheet, 'P', $this->statusTypes);

        // Column Q (Employment Status)
        $this->addDropdownValidation($sheet, 'Q', $this->employmentStatusTypes);

        // Column X (Card Type)
        $this->addDropdownValidation($sheet, 'X', $this->cardTypes);

        // Column Y (Use Card - YES/NO)
        $this->addDropdownValidation($sheet, 'Y', ['YES', 'NO']);
    }

    /**
     * Add dropdown validation to a column
     */
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

    /**
     * Add instruction sheet
     */
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
            ['   • Date of Birth: Format YYYY-MM-DD'],
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
            ['📌 NOTES:'],
            ['   • Department and Position will be auto-created if not exist'],
            ['   • Employee ID will be auto-generated (EMP-YYYY-XXXX)'],
            ['   • Card Number will be auto-generated if left empty and Use Card is YES'],
            ['   • Do not modify the header row'],
            ['   • Maximum file size: 10MB'],
            ['   • Supported formats: .xlsx, .xls, .csv'],
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
     * Process import file - SESUAI DENGAN FORM CREATE
     */
    // app/Services/EmployeeImportExportService.php - Tambahkan validasi lebih detail

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
                'errors' => ['Failed to read file. Please make sure it\'s a valid Excel file.']
            ];
        }

        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();

        // Check if file is empty
        if (empty($rows) || count($rows) < 2) {
            return [
                'success_count' => 0,
                'fail_count' => 1,
                'errors' => ['File is empty. Please fill in the data.']
            ];
        }

        // Remove header
        $header = array_shift($rows);

        // Check if header matches expected columns
        $expectedHeaders = [
            'First Name*',
            'Last Name*',
            'Email*',
            'Password*',
            'Phone',
            'Date of Birth (YYYY-MM-DD)',
            'Gender',
            'National ID',
            'Address',
            'Hire Date (YYYY-MM-DD)*',
            'Probation End Date (YYYY-MM-DD)',
            'Department*',
            'Position*',
            'Default Office',
            'Employment Type*',
            'Status*',
            'Employment Status',
            'Salary',
            'Manager Email',
            'Emergency Contact Name',
            'Emergency Contact Phone',
            'Emergency Contact Relation',
            'Card Number',
            'Card Type',
            'Use Card (YES/NO)'
        ];

        // Log the header for debugging
        Log::info('📋 Header row:', $header);
        Log::info('📋 Expected headers:', $expectedHeaders);

        $successCount = 0;
        $failCount = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            try {
                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                // Check if row has enough columns
                if (count($row) < 25) {
                    $errors[] = "Row " . ($index + 2) . ": Insufficient columns. Expected 25, got " . count($row);
                    $failCount++;
                    continue;
                }

                $data = $this->extractRowData($row);

                // Log data for debugging
                Log::info('📝 Row ' . ($index + 2) . ' data:', $data);

                // Validate row data
                $validationResult = $this->validateRowData($data, $index);
                if (!$validationResult['valid']) {
                    $errors = array_merge($errors, $validationResult['errors']);
                    $failCount++;
                    continue;
                }

                // Process employee creation
                $result = $this->createEmployeeFromData($data);
                if ($result['success']) {
                    $successCount++;
                    Log::info('✅ Row ' . ($index + 2) . ' imported successfully');
                } else {
                    $failCount++;
                    $errors[] = "Row " . ($index + 2) . ": " . $result['message'];
                    Log::error('❌ Row ' . ($index + 2) . ' failed: ' . $result['message']);
                }
            } catch (Exception $e) {
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
     * Extract row data - SESUAI DENGAN FIELD DI TEMPLATE
     */
    protected function extractRowData(array $row): array
    {
        return [
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
    }

    /**
     * Validate row data
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
        if (!empty($data['email'])) {
            $existingEmployee = Employee::where('email', $data['email'])->first();
            if ($existingEmployee) {
                $errors[] = "Row " . ($index + 2) . ": Employee with email '{$data['email']}' already exists";
                $valid = false;
            }
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

        // Validate date formats
        $dateFields = ['hire_date', 'date_of_birth', 'probation_end_date'];
        foreach ($dateFields as $field) {
            if (!empty($data[$field])) {
                $date = \DateTime::createFromFormat('Y-m-d', $data[$field]);
                if (!$date || $date->format('Y-m-d') !== $data[$field]) {
                    $errors[] = "Row " . ($index + 2) . ": Invalid date format for " . ucfirst(str_replace('_', ' ', $field)) . " '{$data[$field]}'. Use YYYY-MM-DD";
                    $valid = false;
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
     * Create employee from data - SESUAI DENGAN FORM CREATE
     */
    protected function createEmployeeFromData(array $data): array
    {
        try {
            DB::beginTransaction();

            // Find or create department
            $department = Department::firstOrCreate(
                ['name' => $data['department']],
                ['code' => strtoupper(substr($data['department'], 0, 3))]
            );

            // Find or create position
            $position = Position::firstOrCreate(
                ['title' => $data['position']],
                ['department_id' => $department->id]
            );

            // Find manager by email
            $managerId = null;
            if (!empty($data['manager_email'])) {
                $manager = Employee::where('email', $data['manager_email'])->first();
                if ($manager) {
                    $managerId = $manager->id;
                }
            }

            // Generate employee ID
            $employeeId = $this->generateEmployeeId($department->id);

            // Generate card number if use_card is YES and card_number is empty
            $cardNumber = $data['card_number'];
            if ($data['use_card'] && empty($cardNumber)) {
                $cardNumber = $this->generateCardNumber($employeeId);
            }

            // Create employee
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

            return [
                'success' => true,
                'employee' => $employee,
                'message' => 'Employee created successfully',
            ];
        } catch (Exception $e) {
            DB::rollBack();
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Generate employee ID
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
     * Generate card number
     */
    public function generateCardNumber(string $employeeId): string
    {
        return 'CARD-' . str_pad(substr($employeeId, -4), 4, '0', STR_PAD_LEFT) . '-' . date('Y');
    }

    /**
     * Create export spreadsheet
     */
    public function createExport($employees, array $filters = []): Spreadsheet
    {
        // ... existing code ...
        $spreadsheet = new Spreadsheet();
        // ... existing code ...
        return $spreadsheet;
    }

    /**
     * Save spreadsheet to file
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
     * Get export file name
     */
    public function getExportFileName(string $prefix = 'Employees'): string
    {
        return $prefix . '_Export_' . now()->format('Ymd_His') . '.xlsx';
    }

    /**
     * Get template file name
     */
    public function getTemplateFileName(): string
    {
        return 'Employee_Import_Template.xlsx';
    }

    /**
     * Validate import file
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
