<?php
// app/Http/Controllers/API/CandidateController.php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class CandidateController extends Controller
{
    /**
     * Get all candidates with pagination and filters
     */
    public function index(Request $request)
    {
        $query = Candidate::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%")
                    ->orWhere('phone', 'LIKE', "%{$search}%")
                    ->orWhere('position_applied', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('has_cv') && $request->has_cv) {
            $query->whereNotNull('cv_file_path');
        }

        $perPage = $request->per_page ?? 15;
        $candidates = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $candidates
        ]);
    }

    /**
     * Get single candidate
     */
    public function show($id)
    {
        $candidate = Candidate::with(['applications', 'onboarding'])->find($id);

        if (!$candidate) {
            return response()->json([
                'status' => 'error',
                'message' => 'Candidate not found'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $candidate
        ]);
    }

    /**
     * Create new candidate with CV upload
     */
    public function store(Request $request)
    {
        \Log::info('=== STORE CANDIDATE ===');
        \Log::info('Has file cv:', $request->hasFile('cv'));
        \Log::info('Files:', $request->allFiles());

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:candidates,email',
            'phone' => 'nullable|string|max:20',
            'position_applied' => 'nullable|string|max:255',
            'experience_years' => 'nullable|integer|min:0',
            'current_salary' => 'nullable|numeric|min:0',
            'expected_salary' => 'nullable|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'status' => 'nullable|in:new,screening,interview,technical_test,hr_interview,offer,hired,rejected,withdrawn',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            \Log::error('Validation failed:', $validator->errors()->toArray());
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        // 🔥 PERBAIKAN: Create candidate tanpa file
        $candidate = Candidate::create($request->except('cv'));

        // 🔥 PERBAIKAN: Handle CV upload
        if ($request->hasFile('cv')) {
            \Log::info('CV file detected, uploading...');
            $uploaded = $this->uploadCVFile($candidate, $request->file('cv'));
            if ($uploaded) {
                \Log::info('CV uploaded successfully');
            } else {
                \Log::error('CV upload failed');
            }
        } else {
            \Log::warning('No CV file in request');
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Candidate created successfully',
            'data' => $candidate
        ], 201);
    }

    /**
     * Update candidate with CV upload
     */
    public function update(Request $request, $id)
    {
        \Log::info('=== UPDATE CANDIDATE ===');
        \Log::info('Has file cv:', $request->hasFile('cv'));

        $candidate = Candidate::find($id);

        if (!$candidate) {
            return response()->json([
                'status' => 'error',
                'message' => 'Candidate not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:candidates,email,' . $id,
            'phone' => 'nullable|string|max:20',
            'position_applied' => 'nullable|string|max:255',
            'experience_years' => 'nullable|integer|min:0',
            'current_salary' => 'nullable|numeric|min:0',
            'expected_salary' => 'nullable|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'status' => 'nullable|in:new,screening,interview,technical_test,hr_interview,offer,hired,rejected,withdrawn',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            \Log::error('Validation failed:', $validator->errors()->toArray());
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $candidate->update($request->except('cv', '_method'));

        // 🔥 PERBAIKAN: Handle CV upload
        if ($request->hasFile('cv')) {
            \Log::info('CV file detected, uploading...');
            // Delete old CV
            if ($candidate->cv_file_path) {
                Storage::disk('public')->delete($candidate->cv_file_path);
                \Log::info('Old CV deleted:', ['path' => $candidate->cv_file_path]);
            }
            $uploaded = $this->uploadCVFile($candidate, $request->file('cv'));
            if ($uploaded) {
                \Log::info('CV uploaded successfully');
            } else {
                \Log::error('CV upload failed');
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Candidate updated successfully',
            'data' => $candidate
        ]);
    }

    /**
     * Delete candidate and CV
     */
    public function destroy($id)
    {
        $candidate = Candidate::find($id);

        if (!$candidate) {
            return response()->json([
                'status' => 'error',
                'message' => 'Candidate not found'
            ], 404);
        }

        // Delete CV if exists
        if ($candidate->cv_file_path) {
            Storage::disk('public')->delete($candidate->cv_file_path);
        }

        $candidate->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Candidate deleted successfully'
        ]);
    }

    /**
     * 🔥 PERBAIKAN: Upload CV file helper
     */
    private function uploadCVFile($candidate, $file)
    {
        try {
            // Generate unique filename
            $fileName = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file->getClientOriginalName());

            // Store file
            $path = $file->storeAs('candidates', $fileName, 'public');

            \Log::info('CV file stored:', [
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ]);

            // Update candidate
            $candidate->update([
                'cv_file_name' => $file->getClientOriginalName(),
                'cv_file_path' => $path,
                'cv_file_type' => $file->getMimeType(),
                'cv_file_size' => $file->getSize(),
            ]);

            return true;
        } catch (\Exception $e) {
            \Log::error('CV upload failed:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Upload CV for existing candidate
     */
    public function uploadCV(Request $request, $id)
    {
        \Log::info('=== UPLOAD CV ===');

        $candidate = Candidate::find($id);

        if (!$candidate) {
            return response()->json([
                'status' => 'error',
                'message' => 'Candidate not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'cv' => 'required|file|mimes:pdf,doc,docx|max:10240'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Delete old CV
        if ($candidate->cv_file_path) {
            Storage::disk('public')->delete($candidate->cv_file_path);
        }

        $uploaded = $this->uploadCVFile($candidate, $request->file('cv'));

        if (!$uploaded) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to upload CV'
            ], 500);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'CV uploaded successfully',
            'data' => $candidate,
            'cv_url' => asset('storage/' . $candidate->cv_file_path),
        ]);
    }

    /**
     * Update candidate status
     */
    public function updateStatus(Request $request, $id)
    {
        $candidate = Candidate::find($id);

        if (!$candidate) {
            return response()->json([
                'status' => 'error',
                'message' => 'Candidate not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:new,screening,interview,technical_test,hr_interview,offer,hired,rejected,withdrawn'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $candidate->update(['status' => $request->status]);

        return response()->json([
            'status' => 'success',
            'message' => 'Candidate status updated successfully',
            'data' => $candidate
        ]);
    }

    /**
     * Get candidates with CV
     */
    public function getWithCV(Request $request)
    {
        $query = Candidate::whereNotNull('cv_file_path');

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        $perPage = $request->per_page ?? 15;
        $candidates = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $candidates
        ]);
    }

    /**
     * Get candidate statistics
     */
    public function stats()
    {
        $stats = [
            'total' => Candidate::count(),
            'new' => Candidate::where('status', 'new')->count(),
            'screening' => Candidate::where('status', 'screening')->count(),
            'interview' => Candidate::whereIn('status', ['interview', 'hr_interview'])->count(),
            'offer' => Candidate::where('status', 'offer')->count(),
            'hired' => Candidate::where('status', 'hired')->count(),
            'rejected' => Candidate::where('status', 'rejected')->count(),
            'withdrawn' => Candidate::where('status', 'withdrawn')->count(),
            'has_cv' => Candidate::whereNotNull('cv_file_path')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $stats
        ]);
    }

    /**
     * Get applications by candidate
     */
    public function getApplications($id)
    {
        $candidate = Candidate::find($id);

        if (!$candidate) {
            return response()->json([
                'status' => 'error',
                'message' => 'Candidate not found'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $candidate->applications()->with('vacancy')->get()
        ]);
    }

    /**
     * Dashboard summary
     */
    public function dashboard()
    {
        $stats = [
            'total_candidates' => Candidate::count(),
            'new_candidates' => Candidate::where('status', 'new')->count(),
            'in_progress' => Candidate::whereIn('status', ['screening', 'interview', 'technical_test', 'hr_interview'])->count(),
            'hired' => Candidate::where('status', 'hired')->count(),
            'rejected' => Candidate::where('status', 'rejected')->count(),
            'recent_candidates' => Candidate::orderBy('created_at', 'desc')->limit(10)->get(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $stats
        ]);
    }

    /**
     * Pipeline data
     */
    public function pipeline()
    {
        $pipeline = [
            'new' => Candidate::where('status', 'new')->count(),
            'screening' => Candidate::where('status', 'screening')->count(),
            'interview' => Candidate::where('status', 'interview')->count(),
            'technical_test' => Candidate::where('status', 'technical_test')->count(),
            'hr_interview' => Candidate::where('status', 'hr_interview')->count(),
            'offer' => Candidate::where('status', 'offer')->count(),
            'hired' => Candidate::where('status', 'hired')->count(),
            'rejected' => Candidate::where('status', 'rejected')->count(),
            'withdrawn' => Candidate::where('status', 'withdrawn')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $pipeline
        ]);
    }

    /**
     * Get status options
     */
    public function statusOptions()
    {
        $statuses = [
            ['value' => 'new', 'label' => 'New'],
            ['value' => 'screening', 'label' => 'Screening'],
            ['value' => 'interview', 'label' => 'Interview'],
            ['value' => 'technical_test', 'label' => 'Technical Test'],
            ['value' => 'hr_interview', 'label' => 'HR Interview'],
            ['value' => 'offer', 'label' => 'Offer'],
            ['value' => 'hired', 'label' => 'Hired'],
            ['value' => 'rejected', 'label' => 'Rejected'],
            ['value' => 'withdrawn', 'label' => 'Withdrawn'],
        ];

        return response()->json([
            'status' => 'success',
            'data' => $statuses
        ]);
    }

    /**
     * Get document types
     */
    public function documentTypes()
    {
        $types = [
            ['value' => 'identity_card', 'label' => 'Identity Card'],
            ['value' => 'family_book', 'label' => 'Family Book'],
            ['value' => 'child_birth_certificate', 'label' => 'Child Birth Certificate'],
            ['value' => 'marriage_certificate', 'label' => 'Marriage Certificate'],
            ['value' => 'tax_id', 'label' => 'Tax ID'],
            ['value' => 'diploma', 'label' => 'Diploma'],
            ['value' => 'academic_transcript', 'label' => 'Academic Transcript'],
            ['value' => 'certificate', 'label' => 'Certificate'],
            ['value' => 'police_clearance', 'label' => 'Police Clearance'],
            ['value' => 'health_insurance', 'label' => 'Health Insurance'],
            ['value' => 'employment_insurance', 'label' => 'Employment Insurance'],
            ['value' => 'drivers_license', 'label' => "Driver's License"],
            ['value' => 'passport', 'label' => 'Passport'],
            ['value' => 'employment_contract', 'label' => 'Employment Contract'],
            ['value' => 'other', 'label' => 'Other'],
        ];

        return response()->json([
            'status' => 'success',
            'data' => $types
        ]);
    }
}
