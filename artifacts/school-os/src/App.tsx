import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Students from "@/pages/students";
import StudentForm from "@/pages/student-form";
import StudentDetail from "@/pages/student-detail";
import Staff from "@/pages/staff";
import Classes from "@/pages/classes";
import Attendance from "@/pages/attendance";
import Fees from "@/pages/fees";
import Announcements from "@/pages/announcements";
import Schools from "@/pages/schools";
import Activity from "@/pages/activity";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/students/new" component={StudentForm} />
      <Route path="/students/:id" component={StudentDetail} />
      <Route path="/students" component={Students} />
      <Route path="/staff" component={Staff} />
      <Route path="/classes" component={Classes} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/fees" component={Fees} />
      <Route path="/announcements" component={Announcements} />
      <Route path="/schools" component={Schools} />
      <Route path="/activity" component={Activity} />
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
