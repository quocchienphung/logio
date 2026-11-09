$ErrorActionPreference = 'Stop'
$repairRoot = (Resolve-Path -LiteralPath 'docs/auto-repair/synthetic-artifacts').Path
$repairExcel = $null
$repairResults = @()
try {
  $repairExcel = New-Object -ComObject Excel.Application
  $repairExcel.Visible = $false
  $repairExcel.DisplayAlerts = $false
  $repairExcel.AskToUpdateLinks = $false
  $repairExcel.AutomationSecurity = 3
  $repairControl = $repairExcel.Workbooks.Add()
  $repairControl.Worksheets.Item(1).Range('A1').Value2 = 'Synthetic control'
  $repairControl.SaveAs((Join-Path $repairRoot 'native-control.xlsx'), 51)
  $repairControl.Close($false)
  [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($repairControl)
  foreach ($repairName in @('native-control.xlsx', 'original.xlsx', 'repaired.xlsx', 'formatting.xlsx')) {
    $repairPath = Join-Path $repairRoot $repairName
    $repairBook = $null
    try {
      # Normal open (CorruptLoad=0), read-only, UpdateLinks=0; never save or repair the fixture.
      $repairBook = $repairExcel.Workbooks.Open($repairPath, 0, $true)
      if ($repairBook.RepairMode) { throw 'Excel opened the workbook in repair mode.' }
      if ($repairName -eq 'repaired.xlsx') {
        if ($repairBook.Worksheets.Item(1).Range('F4').Value2 -ne 'can ho bay tang 3') { throw 'Excel read-back did not match the approved repair.' }
        if ($repairBook.Worksheets.Item(1).Range('A2').Value2 -ne '00001') { throw 'Leading zeros changed.' }
        if (-not $repairBook.Worksheets.Item(1).Rows.Item(2).Hidden) { throw 'Hidden row changed.' }
      }
      if ($repairName -eq 'formatting.xlsx') {
        if ($repairBook.Worksheets.Item(1).Range('C1').Formula -ne '=Other!A1+1') { throw 'Formula changed.' }
        if ($repairBook.Worksheets.Item(1).Range('A1').NumberFormat -ne '@') { throw 'Text format changed.' }
        if (-not $repairBook.Worksheets.Item(1).AutoFilterMode) { throw 'AutoFilter changed.' }
      }
      $repairResults += [pscustomobject]@{ file = $repairName; opened = $true; sheets = $repairBook.Worksheets.Count; repairMode = [bool]$repairBook.RepairMode }
    } catch {
      $repairResults += [pscustomobject]@{ file = $repairName; opened = $false; error = $_.Exception.Message; hresult = $_.Exception.HResult }
    } finally {
      if ($null -ne $repairBook) { $repairBook.Close($false); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($repairBook) }
    }
  }
  [pscustomobject]@{ excelVersion = $repairExcel.Version; syntheticOnly = $true; results = $repairResults } | ConvertTo-Json -Depth 4
  if (@($repairResults | Where-Object { -not $_.opened }).Count -gt 0) { exit 1 }
} finally {
  if ($null -ne $repairExcel) { $repairExcel.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($repairExcel) }
}
