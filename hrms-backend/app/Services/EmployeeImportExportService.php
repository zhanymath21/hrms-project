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
            ['📌 DATE FORMAT:'],
            ['   • YYYY-MM-DD (example: 2024-01-15)'],
            ['   • INVALID DATES WILL FAIL: 2026-06-31, 2026-06-32, etc.'],
            [''],
            ['📌 DEPARTMENT & POSITION:'],
            ['   • Department and Position will be auto-created if not exist'],
            ['   • Use existing department names to avoid duplicates'],
            [''],
            ['📌 EMPLOYMENT TYPE: full_time, part_time, contract, intern'],
            ['📌 STATUS: active, inactive, suspended, terminated, resigned'],
            ['📌 EMPLOYMENT STATUS: probation, permanent, contract'],
            ['📌 GENDER: male, female, other'],
            ['📌 CARD TYPE: RFID, NFC, Barcode, QR'],
            ['📌 USE CARD: YES or NO'],
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
     * VALIDATE ROW DATA
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

        // Validate date formats - CRITICAL FIX
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

        return [
            'valid' => $valid,
            'errors' => $errors,
        ];
    }

    /**
     * CREATE EMPLOYEE FROM DATA
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
                }
            }

            // 4. GENERATE EMPLOYEE ID
            $employeeId = $this->generateEmployeeId($department->id);

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
                'employment_type' => $data['employment_type'] ?? 'full_time',
                'status' => $data['status'] ?? 'active',
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

            Log::info('✅ Employee created: ' . $employee->id);

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

    public function generateCardNumber(string $employeeId): string
    {
        return 'CARD-' . str_pad(substr($employeeId, -4), 4, '0', STR_PAD_LEFT) . '-' . date('Y');
    }

    public function createExport($employees, array $filters = []): Spreadsheet
    {
        // ... existing code ...
        $spreadsheet = new Spreadsheet();
        return $spreadsheet;
    }

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

    public function getExportFileName(string $prefix = 'Employees'): string
    {
        return $prefix . '_Export_' . now()->format('Ymd_His') . '.xlsx';
    }

    public function getTemplateFileName(): string
    {
        return 'Employee_Import_Template.xlsx';
    }

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
