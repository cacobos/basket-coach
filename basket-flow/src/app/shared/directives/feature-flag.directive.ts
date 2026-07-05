import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionService } from '../../core/services/permission.service';
import { DataService } from '../../core/services/data.service';

@Directive({
  selector: '[appFeatureFlag]',
  standalone: true,
})
export class FeatureFlagDirective implements OnInit, OnDestroy {
  private templateRef = inject(TemplateRef);
  private vcr = inject(ViewContainerRef);
  private perms = inject(PermissionService);
  private data = inject(DataService);

  @Input('appFeatureFlag') feature!: string;

  @Input('appFeatureFlagElse') elseTemplate?: TemplateRef<unknown>;

  private sub?: Subscription;

  ngOnInit() {
    const clubId = this.data.currentClub()?.id;
    if (!clubId) return;
    this.sub = this.perms.hasFeatureAccess(this.feature, clubId).subscribe(hasAccess => {
      if (hasAccess) {
        this.vcr.createEmbeddedView(this.templateRef);
      } else if (this.elseTemplate) {
        this.vcr.createEmbeddedView(this.elseTemplate);
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
