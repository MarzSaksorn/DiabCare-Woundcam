import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import PatientRecord from "./pages/PatientRecord";
import Patients from "./pages/Patients";
import DiagnosticCamera from "./pages/DiagnosticCamera";
import PatientRegistration from "./pages/PatientRegistration";
import RegisteredPatientRecord from "./pages/RegisteredPatientRecord";
import RegisteredPatientEdit from "./pages/RegisteredPatientEdit";

function Router() {
  return (
    <Switch>
      <Route path="/patients/new" component={PatientRegistration} />
      <Route path="/patients/registered/:id/edit" component={RegisteredPatientEdit} />
      <Route path="/patients/registered/:id" component={RegisteredPatientRecord} />
      <Route path={"/patients/:id"} component={PatientRecord} />
      <Route path="/camera" component={DiagnosticCamera} />
      <Route path={"/"} component={Home} />
      <Route path="/patients" component={Patients} />
      <Route path="/assessments" component={DiagnosticCamera} />
      <Route path="/reports" component={Home} />
      <Route path="/settings" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
