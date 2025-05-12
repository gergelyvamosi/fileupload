import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpProgressEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, timer, Subject } from 'rxjs';
import { catchError, last, map, tap, retryWhen, delayWhen, take, switchMap, takeUntil } from 'rxjs/operators';

export interface FileUploadProgress {
  filename: string;
  progress: BehaviorSubject<number>;
  request?: HttpRequest<FormData>; // Store the HttpRequest for cancellation
  uploadSubscription?: any;       // Store the subscription for cancellation
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = '/api/upload/multiple';
  private maxRetries = 3;
  private retryDelay = 2000;

  constructor(private http: HttpClient) { }

  upload(files: FileList): Observable<FileUploadProgress[]> {
    const formData = new FormData();
    const progress: FileUploadProgress[] = [];
    const cancelSubject = new Subject<void>(); // Subject to trigger cancellation

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i)!;
      formData.append('files', file, file.name);
      progress.push({ filename: file.name, progress: new BehaviorSubject<number>(0) });
    }

    const request = new HttpRequest('POST', this.apiUrl, formData, {
      reportProgress: true
    });

    progress.forEach(p => p.request = request); // Store the request

    const uploadObservable = this.http.request(request).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress) {
          const percentDone = Math.round((100 * event.loaded) / event.total!);
          const fileProgress = progress.find(p => p.filename);
          if (fileProgress) {
            fileProgress.progress.next(percentDone);
          }
        } else if (event instanceof HttpResponse) {
          progress.forEach(p => p.progress.complete());
          return event.body as string[];
        }
        return null;
      }),
      tap(response => console.log('Files uploaded:', response)),
      last(),
      retryWhen(errors =>
        errors.pipe(
          delayWhen(() => timer(this.retryDelay)),
          take(this.maxRetries),
          tap((error) => console.warn('Retrying upload...', error)),
          takeUntil(cancelSubject), // Cancel retries if cancellation is requested
          last(),
          switchMap(error => throwError(() => error))
        )
      ),
      catchError(this.handleError),
      takeUntil(cancelSubject) // Cancel the main upload if cancellation is requested
    );

    // Store the subscription for each file's progress (though we're returning an array of progress)
    progress.forEach(p => p.uploadSubscription = uploadObservable.subscribe({
      // We don't need to handle next/error/complete here as it's handled in the component's main subscription
    }));

    return new Observable<FileUploadProgress[]>(subscriber => {
      uploadObservable.subscribe({
        next: (response) => subscriber.next(progress), // Emit the progress array
        error: (error) => {
          progress.forEach(p => p.progress.error(error)); // Propagate error to individual progress subjects
          subscriber.error(error);
        },
        complete: () => subscriber.complete()
      });

      // Teardown logic: When the subscription to the returned Observable is unsubscribed,
      // trigger the cancellation.
      return () => {
        console.log('Upload cancelled by user.');
        cancelSubject.next();
        cancelSubject.complete();
        // We don't explicitly abort the HttpRequest here. The browser will likely stop
        // sending data when the subscription is unsubscribed. For more control,
        // you might need to use the `HttpClient.request` with a specific `HttpRequest`
        // object and then potentially try to abort it (browser-dependent and not
        // always reliable for ongoing requests).
        // If you were using a more granular upload per file, you could potentially
        // unsubscribe from individual file upload observables.
      };
    });
  }

  private handleError(error: any) {
    console.error('File upload error (final):', error);
    return throwError(() => error);
  }

  cancelUpload(): void {
    // This method is not directly used here as cancellation is handled in the
    // teardown logic of the main upload observable. If you had individual
    // file uploads, you might call unsubscribe on their subscriptions here.
  }
}