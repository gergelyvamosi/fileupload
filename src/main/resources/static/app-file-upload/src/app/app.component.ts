import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MultipleFileUploadComponent } from "./multiple-file-upload.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MultipleFileUploadComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'app-multiple-file-upload';
}
