import { useState, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AssetList from './components/AssetList';
import AssetForm from './components/AssetForm';
import AssetDetails from './components/AssetDetails';
import EmployeeList from './components/EmployeeList';
import EmployeeDetails from './components/EmployeeDetails';
import AssignmentForm from './components/AssignmentForm';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import ToastHost from './components/ui/ToastHost';
import { ConfirmProvider } from './components/ui/ConfirmProvider';
import {
  Asset,
  AssetListNavigateFilters,
  DEFAULT_ASSET_LIST_FILTERS,
  Employee,
  EmployeeListNavigateFilters,
  DEFAULT_EMPLOYEE_LIST_FILTERS,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assetSearch, setAssetSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [editingAsset, setEditingAsset] = useState<Partial<Asset> | null>(null);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [assigningAsset, setAssigningAsset] = useState<Asset | null>(null);
  const [assetsNavigate, setAssetsNavigate] = useState<{
    token: number;
    filters: AssetListNavigateFilters;
  } | null>(null);
  const [employeesNavigate, setEmployeesNavigate] = useState<{
    token: number;
    filters: EmployeeListNavigateFilters;
  } | null>(null);

  const openAssetsTab = useCallback((partial?: Partial<AssetListNavigateFilters>) => {
    setActiveTab('assets');
    setAssetsNavigate({
      token: Date.now(),
      filters: { ...DEFAULT_ASSET_LIST_FILTERS, ...partial },
    });
  }, []);

  const openEmployeesTab = useCallback((partial?: Partial<EmployeeListNavigateFilters>) => {
    setActiveTab('employees');
    setEmployeesNavigate({
      token: Date.now(),
      filters: { ...DEFAULT_EMPLOYEE_LIST_FILTERS, ...partial },
    });
  }, []);

  const headerSearch =
    activeTab === 'employees' ? employeeSearch : activeTab === 'assets' ? assetSearch : '';
  const onHeaderSearchChange =
    activeTab === 'employees'
      ? setEmployeeSearch
      : activeTab === 'assets'
        ? setAssetSearch
        : () => {};
  const searchPlaceholder =
    activeTab === 'employees'
      ? 'Search people by name, email, or employee ID'
      : activeTab === 'assets'
        ? 'Search assets by name, serial, or assignee'
        : '';
  const showHeaderSearch = activeTab === 'assets' || activeTab === 'employees';

  const clearAssetsNavigate = useCallback(() => setAssetsNavigate(null), []);
  const clearEmployeesNavigate = useCallback(() => setEmployeesNavigate(null), []);

  return (
    <ErrorBoundary>
      <ConfirmProvider>
        <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        headerSearch={headerSearch}
        onHeaderSearchChange={onHeaderSearchChange}
        searchPlaceholder={searchPlaceholder}
        showHeaderSearch={showHeaderSearch}
      >
        {activeTab === 'dashboard' && (
          <Dashboard onOpenAssets={openAssetsTab} onOpenEmployees={openEmployeesTab} />
        )}
        {activeTab === 'assets' && (
          <AssetList
            onEdit={setEditingAsset}
            onAssign={setAssigningAsset}
            onView={setViewingAsset}
            navigateFilters={assetsNavigate}
            onNavigateFiltersApplied={clearAssetsNavigate}
            searchQuery={assetSearch}
            onSearchChange={setAssetSearch}
          />
        )}
        {activeTab === 'employees' && (
          <EmployeeList
            onView={setViewingEmployee}
            searchQuery={employeeSearch}
            navigateFilters={employeesNavigate}
            onNavigateFiltersApplied={clearEmployeesNavigate}
          />
        )}
        {activeTab === 'settings' && <Settings />}

        {editingAsset && <AssetForm asset={editingAsset} onClose={() => setEditingAsset(null)} />}

        {viewingAsset && (
          <AssetDetails asset={viewingAsset} onClose={() => setViewingAsset(null)} />
        )}

        {viewingEmployee && (
          <EmployeeDetails employee={viewingEmployee} onClose={() => setViewingEmployee(null)} />
        )}

        {assigningAsset && (
          <AssignmentForm asset={assigningAsset} onClose={() => setAssigningAsset(null)} />
        )}
        </Layout>
        <ToastHost />
      </ConfirmProvider>
    </ErrorBoundary>
  );
}
