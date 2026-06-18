<?php

namespace App\Http\Controllers\Api;

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

        // Search filter
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

        // Status filter
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Has CV filter
        if ($request->has('has_cv') && $request->has_cv) {
            $query->whereNotNull('cv_file_path');
        }

        // Pagination
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
     * Create new candidate
     */
    public function store(Request $request)
    {
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
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $candidate = Candidate::create($request->all());

        // Handle CV upload if present
        if ($request->hasFile('cv')) {
            $this->handleUploadCV($candidate, $request->file('cv'));
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Candidate created successfully',
            'data' => $candidate
        ], 201);
    }

    /**
     * Update candidate
     */
    public function update(Request $request, $id)
    {
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
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $candidate->update($request->all());

        // Handle CV upload if present
        if ($request->hasFile('cv')) {
            // Delete old CV
            if ($candidate->cv_file_path) {
                Storage::disk('public')->delete($candidate->cv_file_path);
            }
            $this->handleUploadCV($candidate, $request->file('cv'));
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Candidate updated successfully',
            'data' => $candidate
        ]);
    }

    /**
     * Delete candidate
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
     * Upload CV for candidate (PUBLIC METHOD)
     */
    public function uploadCV(Request $request, $id)
    {
        $candidate = Candidate::find($id);

        if (!$candidate) {
            return response()->json([
                'status' => 'error',
                'message' => 'Candidate not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'cv' => 'required|file|mimes:pdf,doc,docx|max:10240' // max 10MB
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

        $file = $request->file('cv');
        $path = $file->store("candidates/{$candidate->id}/cv", 'public');

        $candidate->update([
            'cv_file_name' => $file->getClientOriginalName(),
            'cv_file_path' => $path,
            'cv_file_type' => $file->getMimeType(),
            'cv_file_size' => $file->getSize(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'CV uploaded successfully',
            'data' => $candidate
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
     * 🔥 PERBAIKAN: Ganti nama method dari uploadCV menjadi handleUploadCV
     * untuk menghindari konflik dengan method public uploadCV
     */
    private function handleUploadCV($candidate, $file)
    {
        $path = $file->store("candidates/{$candidate->id}/cv", 'public');

        $candidate->update([
            'cv_file_name' => $file->getClientOriginalName(),
            'cv_file_path' => $path,
            'cv_file_type' => $file->getMimeType(),
            'cv_file_size' => $file->getSize(),
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
