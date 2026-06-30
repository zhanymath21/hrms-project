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
use Illuminate\Support\Facades\Hash;
use Exception;
use Carbon\Carbon;

class EmployeeImportExportService
{
    /**
     * Valid options for dropdown fields
     */
    protected array $validOptions = [
        'gender' => ['male', 'female', 'other'],
        'employment_type' => ['full_time', 'part_time', 'contract', 'intern'],
        'status' => ['active', 'inactive', 'suspended', 'terminated', 'resigned'],
        'employment_status' => ['probation', 'permanent', 'contract'],
        'card_type' => ['RFID', 'NFC', 'Barcode', 'QR'],
        'use_card' => ['YES', 'NO'],
    ];

    /**
     * Required fields for import
     */
    protected array $requiredFields = [
        'first_name',
        'last_name',
        'email',
        'password',
        'hire_date',
        'department',
        'position',
        'employment_type',
        'status'
    ];

    /**
     * Date fields that need validation
     */
    protected array $dateFields = [
        'hire_date',
        'date_of_birth',
        'probation_end_date'
    ];

    /**
     * Status colors for Excel export
     */
    protected array $statusColors = [
        'active' => 'C6EFCE',
        'inactive' => 'FFC7CE',
        'suspended' => 'FFEB9C',
        'terminated' => 'FFC7CE',
        'resigned' => 'FFEB9C',
    ];

    /**
     * Generate position code
     */
    protected function generatePositionCode(string $positionName, int $departmentId): string
    {
        // Get department
        $department = Department::find($departmentId);
        $deptCode = $department->code ?? strtoupper(substr($department->name ?? 'POS', 0, 3));

        // Clean position name for code (remove special chars, take first 10 chars)
        $cleanName = preg_replace('/[^a-zA-Z0-9]/', '', $positionName);
        $positionCode = strtoupper(substr($cleanName, 0, 10));

        // If empty, use default
        if (empty($positionCode)) {
            $positionCode = 'POS';
        }

        // Build code
        $code = $deptCode . '-' . $positionCode;

        // Check if code already exists
        $existing = Position::where('code', $code)->first();
        if ($existing) {
            // Add random suffix if exists
            $suffix = rand(10, 99);
            $code = $deptCode . '-' . $positionCode . $suffix;

            // Check again
            $existing = Position::where('code', $code)->first();
            if ($existing) {
                // Use timestamp as last resort
                $code = $deptCode . '-' . $positionCode . date('is');
            }
        }

        return $code;
    }

    /**
     * Create import template
     */
    public function createTemplate(): Spreadsheet
    {
        try {
            Log::info('Creating employee import template...');

            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Employee Template');

            // Headers
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
                'N1' => 'Employment Type*',
                'O1' => 'Status*',
                'P1' => 'Salary',
                'Q1' => 'Manager Email',
                'R1' => 'Emergency Contact Name',
                'S1' => 'Emergency Contact Phone',
                'T1' => 'Emergency Contact Relation',
                'U1' => 'Card Number',
                'V1' => 'Card Type',
                'W1' => 'Use Card (YES/NO)',
            ];

            foreach ($headers as $cell => $label) {
                $sheet->setCellValue($cell, $label);
            }

            // Apply header styling
            $this->applyHeaderStyle($sheet, count($headers));
            $sheet->getRowDimension(1)->setRowHeight(35);

            // Add example data
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
                'full_time',
                'active',
                '5000000',
                'manager@company.com',
                'Jane Doe',
                '08129876543',
                'Spouse',
                '',
                'RFID',
                'YES'
            ];

            $column = 'A';
            foreach ($exampleData as $value) {
                $sheet->setCellValue($column . '2', $value);
                $column++;
            }

            // Style example row
            $lastColumn = 'W';
            $sheet->getStyle('A2:' . $lastColumn . '2')->applyFromArray([
                'font' => ['italic' => true, 'color' => ['rgb' => '666666']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F5F5F5']],
            ]);

            // Add data validation
            $this->addDataValidation($sheet);

            // Auto-size columns
            foreach (range('A', 'W') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            $sheet->getColumnDimension('I')->setWidth(40);

            // Add instruction sheet
            $this->addInstructionSheet($spreadsheet);

            Log::info('Employee import template created successfully');

            return $spreadsheet;
        } catch (Exception $e) {
            Log::error('Failed to create template: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Apply header styling
     */
    protected function applyHeaderStyle($sheet, int $columnCount): void
    {
        $lastColumn = chr(64 + $columnCount);

        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
                'name' => 'Calibri'
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1A73E8']
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC']
                ]
            ],
        ];

        $sheet->getStyle('A1:' . $lastColumn . '1')->applyFromArray($headerStyle);
    }

    /**
     * Add data validation
     */
    protected function addDataValidation($sheet): void
    {
        $validationColumns = [
            'G' => 'gender',
            'N' => 'employment_type',
            'O' => 'status',
            'V' => 'card_type',
            'W' => 'use_card',
        ];

        foreach ($validationColumns as $column => $type) {
            if (isset($this->validOptions[$type])) {
                $this->addDropdownValidation($sheet, $column, $this->validOptions[$type]);
            }
        }
    }

    /**
     * Add dropdown validation
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
            ['   • Employment Type: full_time, part_time, contract, intern'],
            ['   • Status: active, inactive, suspended, terminated, resigned'],
            ['   • Salary: Monthly salary in numbers'],
            ['   • Manager Email: Must exist in system'],
            ['   • Card Number: Auto-generated if empty'],
            ['   • Card Type: RFID, NFC, Barcode, QR'],
            ['   • Use Card: YES or NO'],
            [''],
            ['📌 IMPORTANT:'],
            ['   • Department and Position will be auto-created if not exist'],
            ['   • Employee ID will be auto-generated (EMP-YYYY-XXXX)'],
            ['   • Position Code will be auto-generated'],
            ['   • Do not modify the header row'],
            ['   • Maximum file size: 10MB'],
            ['   • Supported formats: .xlsx, .xls, .csv'],
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
     * Process import file
     */
    public function processImport(UploadedFile $file): array
    {
        Log::info('📤 Starting employee import...', [
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'file_type' => $file->getMimeType(),
        ]);

        try {
            // Validate file
            $validation = $this->validateImportFile($file);
            if (!$validation['valid']) {
                return [
                    'success' => false,
                    'message' => $validation['message'],
                    'success_count' => 0,
                    'fail_count' => 0,
                    'errors' => [$validation['message']],
                ];
            }

            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file);
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();

            if (empty($rows) || count($rows) < 2) {
                return [
                    'success' => false,
                    'message' => 'File is empty or has no data rows',
                    'success_count' => 0,
                    'fail_count' => 0,
                    'errors' => ['No data found in file'],
                ];
            }

            array_shift($rows);

            $successCount = 0;
            $failCount = 0;
            $errors = [];
            $warnings = [];
            $successfulImports = [];

            DB::beginTransaction();

            try {
                foreach ($rows as $index => $row) {
                    try {
                        if (empty(array_filter($row))) {
                            continue;
                        }

                        $rowNumber = $index + 2;
                        $data = $this->extractRowData($row);

                        $validationResult = $this->validateRowData($data, $rowNumber);

                        if (!empty($validationResult['warnings'])) {
                            $warnings = array_merge($warnings, $validationResult['warnings']);
                        }

                        if (!$validationResult['valid']) {
                            $errors = array_merge($errors, $validationResult['errors']);
                            $failCount++;
                            continue;
                        }

                        $result = $this->createEmployeeFromData($data);
                        if ($result['success']) {
                            $successCount++;
                            $successfulImports[] = [
                                'row' => $rowNumber,
                                'email' => $data['email'],
                                'employee_id' => $result['employee']->employee_id ?? null,
                            ];
                        } else {
                            $failCount++;
                            $errors[] = "Row {$rowNumber}: " . $result['message'];
                        }
                    } catch (Exception $e) {
                        $failCount++;
                        $errors[] = "Row " . ($index + 2) . ": " . $e->getMessage();
                        Log::error('Import row error:', [
                            'row' => $index + 2,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                if ($successCount > 0) {
                    DB::commit();
                    Log::info('✅ Import completed successfully', [
                        'success' => $successCount,
                        'failed' => $failCount,
                    ]);
                } else {
                    DB::rollBack();
                    Log::warning('⚠️ No successful imports, rolling back');
                }
            } catch (Exception $e) {
                DB::rollBack();
                Log::error('❌ Import failed, rolling back: ' . $e->getMessage());
                throw $e;
            }

            return [
                'success' => $successCount > 0,
                'message' => $successCount > 0
                    ? 'Import completed with ' . count($warnings) . ' warnings'
                    : 'No records were imported',
                'success_count' => $successCount,
                'fail_count' => $failCount,
                'errors' => $errors,
                'warnings' => $warnings,
                'successful_imports' => $successfulImports,
            ];
        } catch (Exception $e) {
            Log::error('❌ Import process failed: ' . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Import failed: ' . $e->getMessage(),
                'success_count' => 0,
                'fail_count' => 0,
                'errors' => [$e->getMessage()],
            ];
        }
    }

    /**
     * Extract row data
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
            'employment_type' => trim($row[13] ?? 'full_time'),
            'status' => trim($row[14] ?? 'active'),
            'salary' => trim($row[15] ?? 0),
            'manager_email' => trim($row[16] ?? ''),
            'emergency_contact_name' => trim($row[17] ?? ''),
            'emergency_contact_phone' => trim($row[18] ?? ''),
            'emergency_contact_relation' => trim($row[19] ?? ''),
            'card_number' => trim($row[20] ?? ''),
            'card_type' => trim($row[21] ?? 'RFID'),
            'use_card' => strtoupper(trim($row[22] ?? 'NO')) === 'YES',
        ];
    }

    /**
     * Validate row data
     */
    protected function validateRowData(array $data, int $rowNumber): array
    {
        $errors = [];
        $warnings = [];
        $valid = true;

        // Check required fields
        foreach ($this->requiredFields as $field) {
            if (empty($data[$field])) {
                $errors[] = "Row {$rowNumber}: " . ucfirst(str_replace('_', ' ', $field)) . " is required";
                $valid = false;
            }
        }

        // Validate email
        if (!empty($data['email'])) {
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                $errors[] = "Row {$rowNumber}: Invalid email format '{$data['email']}'";
                $valid = false;
            } else {
                $existing = Employee::where('email', $data['email'])->first();
                if ($existing) {
                    $errors[] = "Row {$rowNumber}: Email '{$data['email']}' already exists";
                    $valid = false;
                }
            }
        }

        // Validate password
        if (!empty($data['password']) && strlen($data['password']) < 8) {
            $errors[] = "Row {$rowNumber}: Password must be at least 8 characters";
            $valid = false;
        }

        // Validate date fields
        foreach ($this->dateFields as $field) {
            if (!empty($data[$field])) {
                $date = \DateTime::createFromFormat('Y-m-d', $data[$field]);
                if (!$date || $date->format('Y-m-d') !== $data[$field]) {
                    $errors[] = "Row {$rowNumber}: Invalid date format for " . ucfirst(str_replace('_', ' ', $field)) . " '{$data[$field]}'. Use YYYY-MM-DD";
                    $valid = false;
                }
            }
        }

        // Validate dropdown options
        $dropdownFields = ['gender', 'employment_type', 'status', 'card_type'];
        foreach ($dropdownFields as $field) {
            if (!empty($data[$field])) {
                $options = $this->validOptions[$field] ?? [];
                if (!in_array($data[$field], $options)) {
                    $errors[] = "Row {$rowNumber}: Invalid '{$field}' value '{$data[$field]}'. Valid options: " . implode(', ', $options);
                    $valid = false;
                }
            }
        }

        // Validate use_card
        if (!empty($data['use_card']) && !in_array($data['use_card'] ? 'YES' : 'NO', ['YES', 'NO'])) {
            $errors[] = "Row {$rowNumber}: Use Card must be YES or NO";
            $valid = false;
        }

        // Validate salary
        if (!empty($data['salary']) && !is_numeric($data['salary'])) {
            $errors[] = "Row {$rowNumber}: Salary must be a number";
            $valid = false;
        }

        // Validate manager email - WARNING ONLY
        if (!empty($data['manager_email'])) {
            $manager = Employee::where('email', $data['manager_email'])->first();
            if (!$manager) {
                $warnings[] = "Row {$rowNumber}: Manager email '{$data['manager_email']}' not found. Manager will be set to null.";
            }
        }

        return [
            'valid' => $valid,
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }

    /**
     * Create employee from data - DENGAN PERBAIKAN POSITION CODE
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

            // Find or create position - PERBAIKI DENGAN CODE
            $position = Position::firstOrCreate(
                ['title' => $data['position']],
                [
                    'department_id' => $department->id,
                    'code' => $this->generatePositionCode($data['position'], $department->id),
                    'is_active' => true,
                ]
            );

            // Jika position sudah ada tapi code null, update code
            if ($position && empty($position->code)) {
                $position->update([
                    'code' => $this->generatePositionCode($data['position'], $department->id)
                ]);
            }

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

            // Calculate probation end date
            $probationEndDate = $data['probation_end_date'] ?? null;
            if (!$probationEndDate && !empty($data['hire_date'])) {
                $probationEndDate = Carbon::parse($data['hire_date'])->addMonths(3)->format('Y-m-d');
            }

            // Generate card number if needed
            $cardNumber = $data['card_number'];
            if ($data['use_card'] && empty($cardNumber)) {
                $cardNumber = $this->generateCardNumber($employeeId);
            }

            // Create employee - SESUAI DENGAN STORE
            $employee = Employee::create([
                'employee_id' => $employeeId,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'phone' => $data['phone'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'gender' => $data['gender'] ?? null,
                'national_id' => $data['national_id'] ?? null,
                'address' => $data['address'] ?? null,
                'hire_date' => $data['hire_date'],
                'probation_end_date' => $probationEndDate,
                'department_id' => $department->id,
                'position_id' => $position->id,
                'employment_type' => $data['employment_type'],
                'status' => $data['status'] ?? 'active',
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

            Log::info('✅ Employee created via import', [
                'employee_id' => $employeeId,
                'email' => $data['email'],
                'position' => $data['position'],
                'position_code' => $position->code,
            ]);

            return [
                'success' => true,
                'employee' => $employee,
                'message' => 'Employee created successfully',
            ];
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('❌ Failed to create employee from import: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage(),
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
}
