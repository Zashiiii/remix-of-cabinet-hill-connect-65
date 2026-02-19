import { forwardRef } from "react";

interface AgeBracketRow {
  bracket: string;
  male: number;
  female: number;
}

interface SectorRow {
  label: string;
  key: string;
  male: number;
  female: number;
}

interface MonitoringReportPrintProps {
  region: string;
  province: string;
  cityMunicipality: string;
  barangay: string;
  totalInhabitants: number;
  totalRegisteredVoters: number;
  totalHouseholds: number;
  totalFamilies: number;
  averageHouseholdSize: number;
  semester: string;
  calendarYear: number;
  ageBrackets: AgeBracketRow[];
  sectors: SectorRow[];
  preparedByName: string;
  submittedByName: string;
  dateAccomplished: string;
}

const MonitoringReportPrint = forwardRef<HTMLDivElement, MonitoringReportPrintProps>(
  (
    {
      region,
      province,
      cityMunicipality,
      barangay,
      totalInhabitants,
      totalRegisteredVoters,
      totalHouseholds,
      totalFamilies,
      averageHouseholdSize,
      semester,
      calendarYear,
      ageBrackets,
      sectors,
      preparedByName,
      submittedByName,
      dateAccomplished,
    },
    ref
  ) => {
    const ageTotalMale = ageBrackets.reduce((s, r) => s + r.male, 0);
    const ageTotalFemale = ageBrackets.reduce((s, r) => s + r.female, 0);

    return (
      <div ref={ref} className="print-report bg-white text-black p-8 max-w-[210mm] mx-auto" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt" }}>
        {/* Header */}
        <div className="text-center mb-6">
          <p className="font-bold text-sm tracking-wider mb-1">RBI FORM C (Revised 2024)</p>
          <h1 className="font-bold text-lg tracking-wide mb-2">MONITORING REPORT</h1>
          <p className="text-sm">
            {semester === "1st" ? "1st" : semester === "2nd" ? "2nd" : "___"} Semester of CY {calendarYear || "____"}
          </p>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 text-sm">
          <p>Region: <span className="font-semibold border-b border-black inline-block min-w-[150px]">{region || "_______________"}</span></p>
          <p>Province: <span className="font-semibold border-b border-black inline-block min-w-[150px]">{province || "_______________"}</span></p>
          <p>City/Municipality: <span className="font-semibold border-b border-black inline-block min-w-[150px]">{cityMunicipality || "_______________"}</span></p>
          <p>Barangay: <span className="font-semibold border-b border-black inline-block min-w-[150px]">{barangay || "_______________"}</span></p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 mb-6 text-sm">
          <p>Total Barangay Inhabitants: <strong>{totalInhabitants}</strong></p>
          <p>Total Registered Voters: <strong>{totalRegisteredVoters}</strong></p>
          <p>Total Households: <strong>{totalHouseholds}</strong></p>
          <p>Total Families: <strong>{totalFamilies}</strong></p>
          <p>Average Household Size: <strong>{averageHouseholdSize}</strong></p>
        </div>

        {/* Age Bracket Table */}
        <p className="font-bold text-sm mb-2">Population by Age Bracket</p>
        <table className="w-full border-collapse border border-black text-xs mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1 text-left">Age Bracket</th>
              <th className="border border-black px-2 py-1 text-center w-20">Male</th>
              <th className="border border-black px-2 py-1 text-center w-20">Female</th>
              <th className="border border-black px-2 py-1 text-center w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {ageBrackets.map((row) => (
              <tr key={row.bracket}>
                <td className="border border-black px-2 py-0.5">{row.bracket}</td>
                <td className="border border-black px-2 py-0.5 text-center">{row.male}</td>
                <td className="border border-black px-2 py-0.5 text-center">{row.female}</td>
                <td className="border border-black px-2 py-0.5 text-center font-semibold">{row.male + row.female}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="border border-black px-2 py-1">Grand Total</td>
              <td className="border border-black px-2 py-1 text-center">{ageTotalMale}</td>
              <td className="border border-black px-2 py-1 text-center">{ageTotalFemale}</td>
              <td className="border border-black px-2 py-1 text-center">{ageTotalMale + ageTotalFemale}</td>
            </tr>
          </tbody>
        </table>

        {/* Sector Table */}
        <p className="font-bold text-sm mb-2">Population by Sector</p>
        <table className="w-full border-collapse border border-black text-xs mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1 text-left">Sector</th>
              <th className="border border-black px-2 py-1 text-center w-20">Male</th>
              <th className="border border-black px-2 py-1 text-center w-20">Female</th>
              <th className="border border-black px-2 py-1 text-center w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((row) => (
              <tr key={row.key}>
                <td className="border border-black px-2 py-0.5">{row.label}</td>
                <td className="border border-black px-2 py-0.5 text-center">{row.male}</td>
                <td className="border border-black px-2 py-0.5 text-center">{row.female}</td>
                <td className="border border-black px-2 py-0.5 text-center font-semibold">{row.male + row.female}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature Section */}
        <div className="flex justify-between items-start mb-8 text-sm">
          <div className="text-center">
            <p className="mb-8">Prepared by:</p>
            <p className="border-b border-black min-w-[200px] font-bold pb-1">{preparedByName || "________________________"}</p>
            <p className="font-semibold">Barangay Secretary</p>
            <p className="text-xs italic">(Signature over Printed Name)</p>
          </div>
          <div className="text-center">
            <p className="mb-8">Submitted by:</p>
            <p className="border-b border-black min-w-[200px] font-bold pb-1">{submittedByName || "________________________"}</p>
            <p className="font-semibold">Punong Barangay</p>
            <p className="text-xs italic">(Signature over Printed Name)</p>
          </div>
        </div>

        <div className="text-sm mb-6">
          <p><strong>Date Accomplished:</strong></p>
          <p className="border-b border-black inline-block min-w-[200px] mt-1">
            {dateAccomplished || "________________________"}
          </p>
        </div>

        <p className="text-xs text-gray-600 border-t border-gray-300 pt-2">
          Note: This RBI Form C (Semestral Monitoring Report) is to be submitted to DILG C/MLGOO as a reference for encoding to BIS-BPS.
        </p>
      </div>
    );
  }
);

MonitoringReportPrint.displayName = "MonitoringReportPrint";

export default MonitoringReportPrint;
