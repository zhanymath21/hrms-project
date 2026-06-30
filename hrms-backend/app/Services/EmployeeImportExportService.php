<?php
// app/Services/EmployeeImportExportService.php

namespace App\Services;

use App\Models\Employee;
use App\Models\Department;
use App\Models\Position;
use DB;
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
use Exception;

class EmployeeImportExportService
{
    /**
     * Valid employment types
     */
    protected array $employmentTypes = ['full_time', 'part_time', 'contract', 'intern'];

    /**
     * Valid status types
     */
    protected array $statusTypes = ['active', 'inactive', 'suspended', 'terminated', 'resigned'];

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
    public function generateCardNumber(Employee $employee): string
    {
        return 'EMP-' . str_pad($employee->id, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Create import template spreadsheet
     */
    public function createTemplate(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Employee Template');

        // Set headers
        $headers = [
            'A1' => 'First Name*',
            'B1' => 'Last Name*',
            'C1' => 'Email*',
            'D1' => 'Phone',
            'E1' => 'Department*',
            'F1' => 'Position*',
            'G1' => 'Employment Type*',
            'H1' => 'Status*',
            'I1' => 'Hire Date (YYYY-MM-DD)*',
            'J1' => 'Salary',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        // Style headers
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A73E8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]],
        ];
        $sheet->getStyle('A1:J1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(25);

        // Add example data
        $exampleData = [
            'John',
            'Doe',
            'john.doe@company.com',
            '08123456789',
            'IT',
            'Senior Developer',
            'full_time',
            'active',
            date('Y-m-d'),
            '5000000'
        ];
        $col = 'A';
        foreach ($exampleData as $value) {
            $sheet->setCellValue($col . '2', $value);
            $col++;
        }

        // Add data validation for dropdowns
        $this->addDataValidation($sheet);

        // Auto-size columns
        foreach (range('A', 'J') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Add instruction sheet
        $this->addInstructionSheet($spreadsheet);

        return $spreadsheet;
    }

    /**
     * Add data validation to sheet
     */
    protected function addDataValidation($sheet): void
    {
        // Column G: Employment Type
        $validation = $sheet->getDataValidation('G2:G1000');
        $validation->setType(DataValidation::TYPE_LIST);
        $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
        $validation->setAllowBlank(false);
        $validation->setShowInputMessage(true);
        $validation->setShowErrorMessage(true);
        $validation->setShowDropDown(true);
        $validation->setFormula1('"' . implode(',', $this->employmentTypes) . '"');

        // Column H: Status
        $validation = $sheet->getDataValidation('H2:H1000');
        $validation->setType(DataValidation::TYPE_LIST);
        $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
        $validation->setAllowBlank(false);
        $validation->setShowInputMessage(true);
        $validation->setShowErrorMessage(true);
        $validation->setShowDropDown(true);
        $validation->setFormula1('"' . implode(',', $this->statusTypes) . '"');
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
            ['   • First Name, Last Name, Email, Department, Position, Hire Date'],
            [''],
            ['📌 EMPLOYMENT TYPE OPTIONS:'],
            ['   • ' . implode(', ', $this->employmentTypes)],
            [''],
            ['📌 STATUS OPTIONS:'],
            ['   • ' . implode(', ', $this->statusTypes)],
            [''],
            ['📌 DATE FORMAT:'],
            ['   • YYYY-MM-DD (example: 2024-01-15)'],
            [''],
            ['📌 NOTES:'],
            ['   • Department and Position will be auto-created if not exist'],
            ['   • Employee ID will be auto-generated (EMP-YYYY-XXXX)'],
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
        $instructionSheet->getColumnDimension('A')->setWidth(70);
    }

    /**
     * Process import file
     */
    public function processImport(UploadedFile $file): array
    {
        Log::info('📤 Starting employee import...');

        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();

        // Remove header
        array_shift($rows);

        $successCount = 0;
        $failCount = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            try {
                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                $data = $this->extractRowData($row, $index);

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
                } else {
                    $failCount++;
                    $errors[] = "Row " . ($index + 2) . ": " . $result['message'];
                }
            } catch (Exception $e) {
                $failCount++;
                $errors[] = "Row " . ($index + 2) . ": " . $e->getMessage();
                Log::error('Import row error: ' . $e->getMessage());
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
     * Extract row data
     */
    protected function extractRowData(array $row, int $index): array
    {
        return [
            'first_name' => trim($row[0] ?? ''),
            'last_name' => trim($row[1] ?? ''),
            'email' => trim($row[2] ?? ''),
            'phone' => trim($row[3] ?? ''),
            'department' => trim($row[4] ?? ''),
            'position' => trim($row[5] ?? ''),
            'employment_type' => trim($row[6] ?? 'full_time'),
            'status' => trim($row[7] ?? 'active'),
            'hire_date' => trim($row[8] ?? ''),
            'salary' => trim($row[9] ?? 0),
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
        if (empty($data['first_name'])) {
            $errors[] = "Row " . ($index + 2) . ": First Name is required";
            $valid = false;
        }
        if (empty($data['last_name'])) {
            $errors[] = "Row " . ($index + 2) . ": Last Name is required";
            $valid = false;
        }
        if (empty($data['email'])) {
            $errors[] = "Row " . ($index + 2) . ": Email is required";
            $valid = false;
        }
        if (empty($data['department'])) {
            $errors[] = "Row " . ($index + 2) . ": Department is required";
            $valid = false;
        }
        if (empty($data['position'])) {
            $errors[] = "Row " . ($index + 2) . ": Position is required";
            $valid = false;
        }
        if (empty($data['hire_date'])) {
            $errors[] = "Row " . ($index + 2) . ": Hire Date is required";
            $valid = false;
        }

        // Validate email format
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

        // Validate employment type
        if (!in_array($data['employment_type'], $this->employmentTypes)) {
            $errors[] = "Row " . ($index + 2) . ": Invalid employment type '{$data['employment_type']}'. Valid options: " . implode(', ', $this->employmentTypes);
            $valid = false;
        }

        // Validate status
        if (!in_array($data['status'], $this->statusTypes)) {
            $errors[] = "Row " . ($index + 2) . ": Invalid status '{$data['status']}'. Valid options: " . implode(', ', $this->statusTypes);
            $valid = false;
        }

        // Validate date format
        if (!empty($data['hire_date'])) {
            $date = \DateTime::createFromFormat('Y-m-d', $data['hire_date']);
            if (!$date || $date->format('Y-m-d') !== $data['hire_date']) {
                $errors[] = "Row " . ($index + 2) . ": Invalid date format '{$data['hire_date']}'. Please use YYYY-MM-DD format";
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

            // Generate employee ID
            $employeeId = $this->generateEmployeeId($department->id);

            // Create employee
            $employee = Employee::create([
                'employee_id' => $employeeId,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'department_id' => $department->id,
                'position_id' => $position->id,
                'employment_type' => $data['employment_type'],
                'status' => $data['status'],
                'hire_date' => $data['hire_date'],
                'salary' => floatval($data['salary'] ?? 0),
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
     * Create export spreadsheet
     */
    public function createExport($employees, array $filters = []): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Employees');

        // Add title
        $this->addExportTitle($sheet, $filters, $employees->count());

        // Add headers
        $row = $this->addExportHeaders($sheet);

        // Add data
        $this->addExportData($sheet, $employees, $row);

        // Auto-size columns
        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $spreadsheet;
    }

    /**
     * Add export title
     */
    protected function addExportTitle($sheet, array $filters, int $total): void
    {
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
        $sheet->setCellValue("A{$row}", 'Exported: ' . now()->format('d M Y H:i') . ' | Total: ' . $total);
        $sheet->getStyle("A{$row}")->getFont()->setSize(9)->setColor(new Color('999999'));
    }

    /**
     * Add export headers
     */
    protected function addExportHeaders($sheet): int
    {
        $row = 5;
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

        return $row + 1;
    }

    /**
     * Add export data
     */
    protected function addExportData($sheet, $employees, int $startRow): void
    {
        $row = $startRow;
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

            // Status coloring
            if (isset($this->statusColors[$employee->status])) {
                $sheet->getStyle('J' . $row)->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $this->statusColors[$employee->status]]]
                ]);
            }

            $sheet->getRowDimension($row)->setRowHeight(18);
            $row++;
        }
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
