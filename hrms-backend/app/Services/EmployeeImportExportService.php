<?php
// app/Services/EmployeeImportExportService.php

namespace App\Services;

use App\Models\Employee;
use App\Models\Department;
use App\Models\Position;
use App\Models\Office;
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
     * Create import template
     */
    public function createTemplate(): Spreadsheet
    {
        try {
            Log::info('Creating employee import template...');

            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Employee Template');

            // Define headers with field descriptions
            $headers = $this->getTemplateHeaders();

            // Set headers
            $column = 'A';
            foreach ($headers as $header) {
                $sheet->setCellValue($column . '1', $header['label']);
                $sheet->getColumnDimension($column)->setAutoSize(true);
                $column++;
            }

            // Apply header styling
            $this->applyHeaderStyle($sheet, $headers);
            $sheet->getRowDimension(1)->setRowHeight(35);

            // Add example data
            $this->addExampleData($sheet);

            // Add data validation for dropdown columns
            $this->addDataValidation($sheet);

            // Add instruction sheet
            $this->addInstructionSheet($spreadsheet);

            // Add field mapping sheet for reference
            $this->addFieldMappingSheet($spreadsheet);

            Log::info('Employee import template created successfully');

            return $spreadsheet;
        } catch (Exception $e) {
            Log::error('Failed to create template: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get template headers with descriptions
     */
    protected function getTemplateHeaders(): array
    {
        return [
            ['field' => 'first_name', 'label' => 'First Name*', 'description' => 'Employee first name', 'required' => true],
            ['field' => 'last_name', 'label' => 'Last Name*', 'description' => 'Employee last name', 'required' => true],
            ['field' => 'email', 'label' => 'Email*', 'description' => 'Must be unique and valid email', 'required' => true],
            ['field' => 'password', 'label' => 'Password*', 'description' => 'Minimum 8 characters', 'required' => true],
            ['field' => 'phone', 'label' => 'Phone', 'description' => 'Contact phone number', 'required' => false],
            ['field' => 'date_of_birth', 'label' => 'Date of Birth', 'description' => 'Format: YYYY-MM-DD', 'required' => false],
            ['field' => 'gender', 'label' => 'Gender', 'description' => 'Options: male, female, other', 'required' => false],
            ['field' => 'national_id', 'label' => 'National ID', 'description' => 'Unique ID number', 'required' => false],
            ['field' => 'address', 'label' => 'Address', 'description' => 'Full address', 'required' => false],
            ['field' => 'hire_date', 'label' => 'Hire Date*', 'description' => 'Format: YYYY-MM-DD', 'required' => true],
            ['field' => 'probation_end_date', 'label' => 'Probation End Date', 'description' => 'Format: YYYY-MM-DD', 'required' => false],
            ['field' => 'department', 'label' => 'Department*', 'description' => 'Will be auto-created if not exist', 'required' => true],
            ['field' => 'position', 'label' => 'Position*', 'description' => 'Will be auto-created if not exist', 'required' => true],
            ['field' => 'default_office', 'label' => 'Default Office', 'description' => 'Office location', 'required' => false],
            ['field' => 'employment_type', 'label' => 'Employment Type*', 'description' => 'Options: full_time, part_time, contract, intern', 'required' => true],
            ['field' => 'status', 'label' => 'Status*', 'description' => 'Options: active, inactive, suspended, terminated, resigned', 'required' => true],
            ['field' => 'employment_status', 'label' => 'Employment Status', 'description' => 'Options: probation, permanent, contract', 'required' => false],
            ['field' => 'salary', 'label' => 'Salary', 'description' => 'Monthly salary in numbers', 'required' => false],
            ['field' => 'manager_email', 'label' => 'Manager Email', 'description' => 'Must exist in system', 'required' => false],
            ['field' => 'emergency_contact_name', 'label' => 'Emergency Contact Name', 'description' => 'Emergency contact person', 'required' => false],
            ['field' => 'emergency_contact_phone', 'label' => 'Emergency Contact Phone', 'description' => 'Emergency contact phone', 'required' => false],
            ['field' => 'emergency_contact_relation', 'label' => 'Emergency Contact Relation', 'description' => 'e.g., Spouse, Parent, Sibling', 'required' => false],
            ['field' => 'card_number', 'label' => 'Card Number', 'description' => 'Auto-generated if empty', 'required' => false],
            ['field' => 'card_type', 'label' => 'Card Type', 'description' => 'Options: RFID, NFC, Barcode, QR', 'required' => false],
            ['field' => 'use_card', 'label' => 'Use Card', 'description' => 'Options: YES or NO', 'required' => false],
        ];
    }

    /**
     * Apply header styling
     */
    protected function applyHeaderStyle($sheet, array $headers): void
    {
        $lastColumn = chr(64 + count($headers));

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
     * Add example data
     */
    protected function addExampleData($sheet): void
    {
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
            '',
            'RFID',
            'YES'
        ];

        $column = 'A';
        foreach ($exampleData as $value) {
            $sheet->setCellValue($column . '2', $value);
            $column++;
        }

        // Style example row as italic and light gray
        $lastColumn = chr(64 + count($exampleData));
        $sheet->getStyle('A2:' . $lastColumn . '2')->applyFromArray([
            'font' => ['italic' => true, 'color' => ['rgb' => '666666']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F5F5F5']],
        ]);
    }

    /**
     * Add data validation to sheet
     */
    protected function addDataValidation($sheet): void
    {
        $validationColumns = [
            'G' => 'gender',
            'O' => 'employment_type',
            'P' => 'status',
            'Q' => 'employment_status',
            'X' => 'card_type',
            'Y' => 'use_card',
        ];

        foreach ($validationColumns as $column => $type) {
            if (isset($this->validOptions[$type])) {
                $this->addDropdownValidation($sheet, $column, $this->validOptions[$type]);
            }
        }
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
        $validation->setErrorTitle('Invalid Option');
        $validation->setError('Please select from the dropdown list.');
        $validation->setPromptTitle('Select from list');
        $validation->setPrompt('Please select a valid option from the dropdown.');
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
            ['📌 IMPORTANT RULES:'],
            ['   • Email must be unique and valid format'],
            ['   • Password must be at least 8 characters'],
            ['   • Department and Position will be auto-created if not exist'],
            ['   • Employee ID will be auto-generated (EMP-YYYY-XXXX)'],
            ['   • Card Number will be auto-generated if left empty and Use Card is YES'],
            ['   • Manager Email must exist in the system'],
            ['   • Do not modify the header row'],
            ['   • Maximum file size: 10MB'],
            ['   • Supported formats: .xlsx, .xls, .csv'],
            [''],
            ['📌 DROPDOWN OPTIONS:'],
            ['   • Gender: male, female, other'],
            ['   • Employment Type: full_time, part_time, contract, intern'],
            ['   • Status: active, inactive, suspended, terminated, resigned'],
            ['   • Employment Status: probation, permanent, contract'],
            ['   • Card Type: RFID, NFC, Barcode, QR'],
            ['   • Use Card: YES, NO'],
            [''],
            ['📌 DATE FORMAT:'],
            ['   • All dates must be in YYYY-MM-DD format (e.g., 2024-01-15)'],
            [''],
            ['📌 EXAMPLE:'],
            ['   • Row 2 shows example data - you can replace it with your data'],
            ['   • Delete row 2 before importing your actual data'],
            [''],
            ['📌 ERROR HANDLING:'],
            ['   • Invalid rows will be skipped with error messages'],
            ['   • Check the import response for detailed error reports'],
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
     * Add field mapping sheet for reference
     */
    protected function addFieldMappingSheet(Spreadsheet $spreadsheet): void
    {
        $mappingSheet = $spreadsheet->createSheet();
        $mappingSheet->setTitle('Field Mapping');

        $headers = ['Column', 'Field Name', 'Description', 'Required', 'Valid Options'];
        $column = 'A';
        foreach ($headers as $header) {
            $mappingSheet->setCellValue($column . '1', $header);
            $mappingSheet->getStyle($column . '1')->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A73E8']],
            ]);
            $column++;
        }

        $fields = $this->getTemplateHeaders();
        $row = 2;
        $columnLetters = range('A', 'Y');

        foreach ($fields as $index => $field) {
            $colLetter = $columnLetters[$index] ?? '';
            $mappingSheet->setCellValue('A' . $row, $colLetter);
            $mappingSheet->setCellValue('B' . $row, $field['field']);
            $mappingSheet->setCellValue('C' . $row, $field['description'] ?? '');
            $mappingSheet->setCellValue('D' . $row, $field['required'] ? 'Yes' : 'No');

            // Add valid options if exists
            if (isset($this->validOptions[$field['field']])) {
                $mappingSheet->setCellValue('E' . $row, implode(', ', $this->validOptions[$field['field']]));
            }
            $row++;
        }

        foreach (range('A', 'E') as $col) {
            $mappingSheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    /**
     * Process import file with detailed error handling
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

            // Load spreadsheet
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

            // Remove header
            array_shift($rows);

            $successCount = 0;
            $failCount = 0;
            $errors = [];
            $successfulImports = [];

            DB::beginTransaction();

            try {
                foreach ($rows as $index => $row) {
                    try {
                        // Skip empty rows
                        if (empty(array_filter($row))) {
                            continue;
                        }

                        $rowNumber = $index + 2;
                        $data = $this->extractRowData($row);

                        // Validate row data
                        $validationResult = $this->validateRowData($data, $rowNumber);
                        if (!$validationResult['valid']) {
                            $errors = array_merge($errors, $validationResult['errors']);
                            $failCount++;
                            continue;
                        }

                        // Create employee
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
                            'trace' => $e->getTraceAsString(),
                        ]);
                    }
                }

                // Commit if there are successful imports
                if ($successCount > 0) {
                    DB::commit();
                    Log::info('✅ Import completed successfully', [
                        'success' => $successCount,
                        'failed' => $failCount,
                        'total' => $successCount + $failCount,
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
                'message' => $successCount > 0 ? 'Import completed successfully' : 'No records were imported',
                'success_count' => $successCount,
                'fail_count' => $failCount,
                'errors' => $errors,
                'successful_imports' => $successfulImports,
            ];
        } catch (Exception $e) {
            Log::error('❌ Import process failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

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
     * Validate row data with detailed errors
     */
    protected function validateRowData(array $data, int $rowNumber): array
    {
        $errors = [];
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
                // Check if email already exists
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
        $dropdownFields = ['gender', 'employment_type', 'status', 'employment_status', 'card_type'];
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

        // Validate manager email if provided
        if (!empty($data['manager_email'])) {
            $manager = Employee::where('email', $data['manager_email'])->first();
            if (!$manager) {
                $errors[] = "Row {$rowNumber}: Manager email '{$data['manager_email']}' not found in system";
                $valid = false;
            }
        }

        return [
            'valid' => $valid,
            'errors' => $errors,
        ];
    }

    /**
     * Create employee from data
     */
    protected function createEmployeeFromData(array $data): array
    {
        try {
            // Find or create department
            $department = Department::firstOrCreate(
                ['name' => $data['department']],
                ['code' => strtoupper(substr($data['department'], 0, 3))],
            );

            // Find or create position
            $position = Position::firstOrCreate(
                ['title' => $data['position']],
                ['department_id' => $department->id],
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

            // Generate card number if needed
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
                'password' => Hash::make($data['password']),
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

            return [
                'success' => true,
                'employee' => $employee,
                'message' => 'Employee created successfully',
            ];
        } catch (Exception $e) {
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
     * Create export spreadsheet
     */
    public function createExport($employees, array $filters = []): Spreadsheet
    {
        // ... existing export code ...
        $spreadsheet = new Spreadsheet();
        // ... implement export ...
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
}
