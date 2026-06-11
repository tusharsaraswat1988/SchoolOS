import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { setAuthTokenGetter } from "@workspace/api-client-react";

import { Toaster } from "@/components/ui/toaster";

import { TooltipProvider } from "@/components/ui/tooltip";

import { ProtectedRoute } from "@/lib/route-guard";

import { useAuthStore } from "@/lib/auth";

import NotFound from "@/pages/not-found";



import Login from "@/pages/login";

import Platform from "@/pages/platform";

import SocietyDashboard from "@/pages/society-dashboard";

import SelectBranch from "@/pages/select-branch";

import Dashboard from "@/pages/dashboard";

import TeacherDashboard from "@/pages/teacher-dashboard";

import AccountsDashboard from "@/pages/accounts-dashboard";

import ParentDashboard from "@/pages/parent-dashboard";

import StudentDashboard from "@/pages/student-dashboard";

import Students from "@/pages/students";

import StudentForm from "@/pages/student-form";

import StudentDetail from "@/pages/student-detail";

import Staff from "@/pages/staff";

import Classes from "@/pages/classes";

import Attendance from "@/pages/attendance";

import Fees from "@/pages/fees";

import Announcements from "@/pages/announcements";

import Schools from "@/pages/schools";

import SchoolSettings from "@/pages/school-settings";

import Subjects from "@/pages/subjects";

import Examinations from "@/pages/examinations";

import StaffAttendance from "@/pages/staff-attendance";

import Udise from "@/pages/udise";

import FeeStructure from "@/pages/fee-structure";

import Activity from "@/pages/activity";

import Analytics from "@/pages/analytics";



setAuthTokenGetter(() => useAuthStore.getState().getToken());



const queryClient = new QueryClient({

  defaultOptions: {

    queries: {

      retry: false,

      refetchOnWindowFocus: false,

    },

  },

});



const branchRoles = ["school_admin", "principal", "coordinator", "teacher", "accountant"] as const;



function Router() {

  return (

    <Switch>

      <Route path="/">

        <Redirect to="/login" />

      </Route>

      <Route path="/login" component={Login} />



      <Route path="/platform">

        <ProtectedRoute roles={["super_admin"]}>

          <Platform />

        </ProtectedRoute>

      </Route>



      <Route path="/societies/:societyId">

        <ProtectedRoute roles={["super_admin", "society_admin"]}>

          <SocietyDashboard />

        </ProtectedRoute>

      </Route>



      <Route path="/select-branch">

        <ProtectedRoute roles={["school_admin"]}>

          <SelectBranch />

        </ProtectedRoute>

      </Route>



      <Route path="/dashboard">

        <ProtectedRoute roles={[...branchRoles]} requireBranch>

          <Dashboard />

        </ProtectedRoute>

      </Route>



      <Route path="/teacher/dashboard">

        <ProtectedRoute roles={["teacher"]} requireBranch>

          <TeacherDashboard />

        </ProtectedRoute>

      </Route>



      <Route path="/accounts/dashboard">

        <ProtectedRoute roles={["accountant"]} requireBranch>

          <AccountsDashboard />

        </ProtectedRoute>

      </Route>



      <Route path="/parent/dashboard">

        <ProtectedRoute roles={["parent"]} requireStudent>

          <ParentDashboard />

        </ProtectedRoute>

      </Route>



      <Route path="/student/dashboard">

        <ProtectedRoute roles={["student"]} requireStudent>

          <StudentDashboard />

        </ProtectedRoute>

      </Route>



      <Route path="/schools">

        <ProtectedRoute roles={["super_admin", "society_admin"]}>

          <Schools />

        </ProtectedRoute>

      </Route>



      <Route path="/students/new">

        <ProtectedRoute roles={["school_admin", "principal", "teacher"]} requireBranch>

          <StudentForm />

        </ProtectedRoute>

      </Route>

      <Route path="/students/:id/edit">

        <ProtectedRoute roles={["school_admin", "principal", "teacher"]} requireBranch>

          <StudentForm />

        </ProtectedRoute>

      </Route>

      <Route path="/students/:id">

        <ProtectedRoute roles={["school_admin", "principal", "teacher"]} requireBranch>

          <StudentDetail />

        </ProtectedRoute>

      </Route>

      <Route path="/students">

        <ProtectedRoute roles={["school_admin", "principal", "teacher"]} requireBranch>

          <Students />

        </ProtectedRoute>

      </Route>



      <Route path="/staff">

        <ProtectedRoute roles={["school_admin", "principal"]} requireBranch>

          <Staff />

        </ProtectedRoute>

      </Route>

      <Route path="/classes">

        <ProtectedRoute roles={["school_admin", "principal", "teacher"]} requireBranch>

          <Classes />

        </ProtectedRoute>

      </Route>

      <Route path="/attendance">

        <ProtectedRoute roles={["school_admin", "principal", "teacher"]} requireBranch>

          <Attendance />

        </ProtectedRoute>

      </Route>

      <Route path="/staff-attendance">

        <ProtectedRoute roles={["school_admin", "principal"]} requireBranch>

          <StaffAttendance />

        </ProtectedRoute>

      </Route>

      <Route path="/fees">

        <ProtectedRoute roles={["school_admin", "principal", "accountant"]} requireBranch>

          <Fees />

        </ProtectedRoute>

      </Route>

      <Route path="/fee-structure">

        <ProtectedRoute roles={["school_admin", "principal"]} requireBranch>

          <FeeStructure />

        </ProtectedRoute>

      </Route>

      <Route path="/announcements">

        <ProtectedRoute roles={["school_admin", "principal", "teacher"]} requireBranch>

          <Announcements />

        </ProtectedRoute>

      </Route>

      <Route path="/school-settings">

        <ProtectedRoute roles={["super_admin", "school_admin", "principal"]}>

          <SchoolSettings />

        </ProtectedRoute>

      </Route>

      <Route path="/subjects">

        <ProtectedRoute roles={["school_admin", "principal", "teacher"]} requireBranch>

          <Subjects />

        </ProtectedRoute>

      </Route>

      <Route path="/examinations">

        <ProtectedRoute roles={["school_admin", "principal", "teacher"]} requireBranch>

          <Examinations />

        </ProtectedRoute>

      </Route>

      <Route path="/udise">

        <ProtectedRoute roles={["super_admin", "school_admin", "principal"]}>

          <Udise />

        </ProtectedRoute>

      </Route>

      <Route path="/activity">

        <ProtectedRoute roles={["school_admin", "principal"]} requireBranch>

          <Activity />

        </ProtectedRoute>

      </Route>

      <Route path="/analytics">

        <ProtectedRoute roles={["school_admin", "principal"]} requireBranch>

          <Analytics />

        </ProtectedRoute>

      </Route>



      <Route component={NotFound} />

    </Switch>

  );

}



function App() {

  return (

    <QueryClientProvider client={queryClient}>

      <TooltipProvider>

        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>

          <Router />

        </WouterRouter>

        <Toaster />

      </TooltipProvider>

    </QueryClientProvider>

  );

}



export default App;


