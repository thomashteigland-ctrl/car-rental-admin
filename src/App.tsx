import { Route, Routes } from "react-router-dom";
import { Shell } from "./components/shell";
import { BookingDetailPage } from "./pages/BookingDetailPage";
import { BookingNewPage } from "./pages/BookingNewPage";
import { BookingsPage } from "./pages/BookingsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { CarDetailPage } from "./pages/CarDetailPage";
import { CarNewPage } from "./pages/CarNewPage";
import { CarsPage } from "./pages/CarsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ServicePage } from "./pages/ServicePage";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/bookings/new" element={<BookingNewPage />} />
        <Route path="/bookings/:id" element={<BookingDetailPage />} />
        <Route path="/cars" element={<CarsPage />} />
        <Route path="/cars/new" element={<CarNewPage />} />
        <Route path="/cars/:id" element={<CarDetailPage />} />
        <Route path="/service" element={<ServicePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Shell>
  );
}
