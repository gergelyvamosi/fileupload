import { RouterOutlet } from '@angular/router';
import { Component, OnDestroy } from '@angular/core';
import { FileUploadService, FileUploadProgress } from './file-upload.service';
import { Subscription } from 'rxjs';
import "@angular/compiler";



@Component({
  selector: 'app-root',
  template: `
    <div>
      <input type="file" multiple (change)="onFileSelected($event)">
      <div *ngFor="let fileProgress of uploadProgress">
        {{ fileProgress.filename }}:
        <progress [value]="fileProgress.progress" max="100"></progress>
        <span>{{ (fileProgress.progress)?.toFixed(0) }}%</span>
        <button *ngIf="(fileProgress.progress | asysnc) !== 100 && !errorMessage" (click)="cancelFile(fileProgress)">Cancel</button>
      </div>
      <div *ngIf="uploadedFiles && uploadedFiles.length > 0">
        <h3>Uploaded Files:</h3>
        <ul>
          <li *ngFor="let filename of uploadedFiles">{{ filename }}</li>
        </ul>
      </div>
      <div *ngIf="errorMessage">
        <p style="color: red;">Error: {{ errorMessage }}</p>
      </div>
    </div>
  `
})
export class AppComponent implements OnDestroy {
  uploadProgress: FileUploadProgress[] = [];
  uploadedFiles: string[] = [];
  errorMessage: string = '';
  private uploadSubscription: Subscription | null = null;

  constructor(private fileUploadService: FileUploadService) { }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      this.uploadProgress = [];
      this.uploadedFiles = [];
      this.errorMessage = '';
      this.uploadSubscription = this.fileUploadService.upload(files).subscribe({
        next: (progressArray) => {
          this.uploadProgress = progressArray; // Update the progress array
          const completed = this.uploadProgress.every(p => p.progress.value === 100);
          if (completed && !this.errorMessage) {
            this.uploadedFiles = progressArray.filter(p => p.progress.value === 100).map(p => p.filename);
          }
        },
        error: (error) => {
          this.errorMessage = error.message || 'File upload failed.';
          this.uploadProgress.forEach(p => p.progress.complete());
        },
        complete: () => {
          console.log('Upload process completed.');
        }
      });
    }
  }

  cancelFile(fileProgress: FileUploadProgress): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
      this.errorMessage = 'Upload cancelled by user.';
      this.uploadProgress.forEach(p => p.progress.complete()); // Mark all as complete (or reset as needed)
    }
  }

  ngOnDestroy(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
    }
  }
}