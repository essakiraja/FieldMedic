Write-Host "Deploying backend to Cloud Run..." -ForegroundColor Green

gcloud run deploy fieldmedic-api `
  --source ./backend `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars "GCP_PROJECT_ID=medic-4053,GCP_REGION=us-central1,FIRESTORE_DB=(default),STORAGE_BUCKET=medic-4053-assets,GEMINI_API_KEY=AIzaSyBZ-g1QUQUbt-0fMnSV-YOO6cVEDqMfehI"
  
  
Write-Host "Done! Live at https://fieldmedic-api-1048557699598.us-central1.run.app" -ForegroundColor Green