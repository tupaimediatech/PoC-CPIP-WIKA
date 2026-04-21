<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ColumnAliasController;
use App\Http\Controllers\EquipmentLogController;
use App\Http\Controllers\HarsatController;
use App\Http\Controllers\MaterialLogController;
use App\Http\Controllers\ProgressCurveController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectWbsController;
use App\Http\Controllers\ProjectRiskController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\WorkItemController;
use Illuminate\Support\Facades\Route;

// ── Auth (public) ───────────────���─────────────────────────────���────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout',           [AuthController::class, 'logout']);
        Route::get('/me',                [AuthController::class, 'me']);
        Route::get('/sessions',          [AuthController::class, 'sessions']);
        Route::delete('/sessions/{id}',  [AuthController::class, 'revokeSession']);
    });
});

// ── Roles ──────────────────────────────────────────��───────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/roles', [RoleController::class, 'index']);
    Route::get('/users/{user}/role', [RoleController::class, 'getUserRole']);
    Route::patch('/users/{user}/role', [RoleController::class, 'assignRole']);
});

// ── Read-only (public for PoC) ─────────────────────────────────────────────────
Route::get('/projects/summary',                    [ProjectController::class, 'summary']);
Route::get('/projects/sbu-distribution',           [ProjectController::class, 'sbuDistribution']);
Route::get('/projects/filter-options',             [ProjectController::class, 'filterOptions']);
Route::get('/projects/building/cpi',               [ProjectController::class, 'buildingCpiList']);
Route::get('/projects/building/spi',               [ProjectController::class, 'buildingSpiList']);
Route::get('/projects/infrastructure/cpi',         [ProjectController::class, 'infrastructureCpiList']);
Route::get('/projects/infrastructure/spi',         [ProjectController::class, 'infrastructureSpiList']);
Route::get('/projects/{project}/insight',          [ProjectController::class, 'insight'])->whereNumber('project');
Route::get('/projects',                            [ProjectController::class, 'index']);
Route::get('/projects/{project}',                  [ProjectController::class, 'show'])->whereNumber('project');
// ── Public endpoints (no auth required) ─────��─────────────────────────────────
Route::get('/column-aliases',                      [ColumnAliasController::class, 'index']);
Route::get('/column-aliases/{columnAlias}',        [ColumnAliasController::class, 'show']);
Route::get('/harsat/trend',                        [HarsatController::class, 'trend']);

// ── Protected read endpoints (scoped to authenticated user) ───────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/projects/export-dashboard',           [ProjectController::class, 'exportDashboard']);

    Route::get('/projects/{project}/wbs-phases',                    [ProjectWbsController::class, 'index']);
    Route::get('/projects/{project}/wbs-phases/{wbsModel}',        [ProjectWbsController::class, 'show']);

    Route::get('/wbs-phases/{wbsModel}/work-items',               [WorkItemController::class, 'index']);
    Route::get('/wbs-phases/{wbsModel}/hpp-summary',              [WorkItemController::class, 'hppSummary']);
    Route::get('/work-items/{workItem}',                          [WorkItemController::class, 'show']);
    Route::get('/wbs-phases/{wbsModel}/materials',                [MaterialLogController::class, 'index']);
    Route::get('/wbs-phases/{wbsModel}/equipment',                [EquipmentLogController::class, 'index']);

    Route::get('/work-items/{workItem}/materials',                [MaterialLogController::class, 'showByWorkItem']);
    Route::get('/work-items/{workItem}/equipment',                [EquipmentLogController::class, 'showByWorkItem']);

    Route::get('/projects/{project}/progress-curve',   [ProgressCurveController::class, 'index']);
    Route::get('/projects/{project}/risks',            [ProjectRiskController::class, 'index']);

    Route::get('/ingestion-files',                     [ProjectController::class, 'ingestionFiles']);
    Route::get('/ingestion-files/{ingestionFile}/download', [ProjectController::class, 'download']);

    Route::post('/projects/upload',                        [ProjectController::class, 'upload']);
    Route::post('/ingestion-files/{ingestionFile}/reprocess', [ProjectController::class, 'reprocess']);
});

// ── Write endpoints (protected) ────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/projects',                            [ProjectController::class, 'store']);
    Route::put('/projects/{project}',                   [ProjectController::class, 'update']);
    Route::patch('/projects/{project}',                 [ProjectController::class, 'update']);
    Route::delete('/projects/{project}',                [ProjectController::class, 'destroy']);

    Route::post('/projects/{project}/risks',            [ProjectRiskController::class, 'store']);
    Route::put('/projects/{project}/risks/{risk}',      [ProjectRiskController::class, 'update']);
    Route::patch('/projects/{project}/risks/{risk}',    [ProjectRiskController::class, 'update']);
    Route::delete('/projects/{project}/risks/{risk}',   [ProjectRiskController::class, 'destroy']);

    Route::post('/column-aliases',                      [ColumnAliasController::class, 'store']);
    Route::put('/column-aliases/{columnAlias}',         [ColumnAliasController::class, 'update']);
    Route::patch('/column-aliases/{columnAlias}',       [ColumnAliasController::class, 'update']);
    Route::delete('/column-aliases/{columnAlias}',      [ColumnAliasController::class, 'destroy']);

    Route::post('/harsat',                              [HarsatController::class, 'store']);
});
