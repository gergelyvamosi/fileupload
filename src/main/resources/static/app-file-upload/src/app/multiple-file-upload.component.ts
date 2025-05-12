import { HttpClient, HttpRequest, HttpEvent, HttpEventType } from '@angular/common/http';
import { Component, OnDestroy, Inject, OnInit, PLATFORM_ID, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'; // Import PLATFORM_ID
import { Subscription, timer, throwError } from 'rxjs';
import { retryWhen, delayWhen, take, tap, catchError } from 'rxjs/operators';
import { isPlatformBrowser, CommonModule } from '@angular/common';

import "@angular/compiler";

interface FileUpload {
    filename: string;
    progress: number;  // Store the progress as a number
    subscription?: Subscription; // Store the subscription for cancellation
    status: 'pending' | 'uploading' | 'completed' | 'cancelled' | 'error';
    retryCount: number;
}

@Component({
    selector: 'app-multiple-file-upload', //app-multiple-file-upload
    template: `
      <input type="file" multiple (change)="onFileSelected($event)">
      <div *ngFor="let file of files; let i = index" class="file-upload-item">
        <div class="file-name">{{ file.filename }}</div>
        <div *ngIf="file.status === 'uploading'">
          <progress [value]="file.progress" max="100"></progress>
          <span>{{ file.progress.toFixed(0) }}%</span>
          <button (click)="cancelUpload(i)" *ngIf="file.status === 'uploading'">Cancel</button>
          <span *ngIf="file.retryCount > 0"> Retrying... ({{file.retryCount}} attempts)</span>
        </div>
        <div *ngIf="file.status === 'completed'">Completed</div>
        <div *ngIf="file.status === 'cancelled'">Cancelled</div>
        <div *ngIf="file.status === 'error'">Error</div>
      </div>
      <div *ngIf="errorMessage" class="error-message">{{ errorMessage }}</div>
    `,
    styles: [`
      .file-upload-item {
        margin-bottom: 10px;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      .file-name {
        font-weight: bold;
        margin-bottom: 5px;
      }
      .progress-container {
        width: 100%;
        height: 10px;
        background-color: #eee;
        border-radius: 5px;
        margin-bottom: 5px;
        overflow: hidden;
      }
      progress {
        width: 100%;
        height: 10px;
        border: none;
        background-color: #007bff;
        border-radius: 5px;
      }
      progress::-webkit-progress-bar {
        background-color: #eee;
        border-radius: 5px;
      }
      progress::-webkit-progress-value {
        background-color: #007bff;
        border-radius: 5px;
      }
      .error-message {
        color: red;
        margin-top: 10px;
      }
    `],
    schemas: [CUSTOM_ELEMENTS_SCHEMA], // Add CUSTOM_ELEMENTS_SCHEMA to the schemas array
    imports: [CommonModule]
})
export class MultipleFileUploadComponent implements OnInit, OnDestroy { //MultipleFileUploadComponent
    files: FileUpload[] = [];
    errorMessage: string = '';
    private subscriptions: Subscription[] = []; // Keep track of all subscriptions
    private maxRetries = 3;
    private retryDelay = 2000;


    constructor(private http: HttpClient,
                @Inject(PLATFORM_ID) private platformId: Object) {} // Inject PLATFORM_ID

    ngOnInit() {
    }

    onFileSelected(event: any) {
        const fileList: FileList = event.target.files;
        if (!fileList || fileList.length === 0) {
            return;
        }

        this.files = []; // Clear previous uploads
        this.errorMessage = '';
        this.subscriptions = [];

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            this.files.push({
                filename: file.name,
                progress: 0, // Initialize as 0
                status: 'pending',
                retryCount: 0
            });
            this.uploadFile(i, file);
        }

    }

    uploadFile(index: number, file: File) {
        if (isPlatformBrowser(this.platformId)) { // Make sure http call is made only in browser
            const formData = new FormData();
            formData.append('files', file, file.name);

            const req = new HttpRequest('POST', '/api/upload/multiple', formData, {
                reportProgress: true
            });

            this.files[index].status = 'uploading';
            this.files[index].retryCount = 0; //initialise retry count
            const subscription = this.http.request(req).pipe(
                retryWhen(errors =>
                    errors.pipe(
                        delayWhen(() => timer(this.retryDelay)),
                        take(this.maxRetries),
                        tap(() => {
                            this.files[index].retryCount++;
                            console.log(`Retrying ${file.name} - attempt ${this.files[index].retryCount}`);
                        }),
                        catchError(err => {
                            this.files[index].status = 'error';
                            this.files[index].progress = 0;
                            return throwError(() => err);
                        })
                    )
                ),
                catchError(err => {
                    this.files[index].status = 'error';
                    this.files[index].progress = 0;
                    return throwError(() => err);
                }) // Handle error after retries
            ).subscribe(
                (event: HttpEvent<any>) => {
                    switch (event.type) {
                        case HttpEventType.UploadProgress:
                            this.files[index].progress = Math.round((100 * event.loaded) / event.total!);
                            break;
                        case HttpEventType.Response:
                            this.files[index].status = 'completed';
                            this.files[index].progress = 100;
                            console.log('Upload finished:', event.body);
                            break;
                    }

                },
                (error) => {
                    this.files[index].status = 'error';
                    this.files[index].progress = 0;
                    this.errorMessage = error.message || 'File upload failed.';
                    console.error('Upload error:', error);

                },
                () => {
                    if (this.files[index].status !== 'error') {
                        this.files[index].progress = 100;

                    }
                }
            );
            this.files[index].subscription = subscription; // Store the subscription
            this.subscriptions.push(subscription);
        }
    }

    cancelUpload(index: number) {
        if (this.files[index].subscription) {
            this.files[index].subscription!.unsubscribe();
            this.files[index].status = 'cancelled';
            this.files[index].progress = 0; // Reset Progress
        }
    }

    ngOnDestroy() {
        // Unsubscribe from all subscriptions to prevent memory leaks
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    get isPlatformBrowser(): boolean {
        return isPlatformBrowser(this.platformId === 'browser');
    }
}

