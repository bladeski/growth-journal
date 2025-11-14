import { LoggingService } from '@bladeski/logger';
import { BaseComponent } from './BaseComponent.ts';
import { MessageComponent } from '../MessageComponent/MessageComponent.ts';
import type { IPropTypes } from './interfaces/IPropTypes.ts';

const logger = LoggingService.getInstance();

/**
 * BaseFormComponent - Extended base class for form components
 *
 * Provides common functionality for all checkin/review forms:
 * - Form validation
 * - Loading state management
 * - Message handling (error/success)
 * - Submit button updates
 * - Field update handlers
 */
export abstract class BaseFormComponent<
  TProps extends IFormProps,
  TEvents = Record<string, never>,
> extends BaseComponent<TProps, TEvents> {
  /**
   * Handle form submission with standardized validation and loading states
   *
   * @param event - Form submit event
   * @param validator - Optional custom validation function
   * @param dataBuilder - Function to build submit data from props
   * @param apiCall - API call function that returns a Promise
   * @param successMessage - Success message to display
   * @param componentName - Name of component for logging
   */
  protected async handleFormSubmit<TData>(
    event: Event,
    validator: (() => string | null) | null,
    dataBuilder: () => TData,
    apiCall: (data: TData) => Promise<unknown>,
    successMessage: string,
    componentName: string,
  ): Promise<void> {
    event.preventDefault();

    if (this.props.isLoading) return;

    // HTML5 validation
    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Custom validation if provided
    if (validator) {
      const validationError = validator();
      if (validationError) {
        this.props.errorMessage = validationError;
        this.updateMessages();
        return;
      }
    }

    const data = dataBuilder();

    // Set loading state
    this.props.isLoading = true;
    this.updateSubmitButton();
    this.clearMessages();

    try {
      await apiCall(data);

      this.props.successMessage = successMessage;
      this.updateMessages();

      // Emit submit event with data (subclass should handle)
      this.dispatchEvent(
        new CustomEvent('submit', { detail: data, bubbles: true, composed: true }),
      );

      return;
    } catch (error) {
      logger.error(`Error saving ${componentName}`, { error });
      this.props.errorMessage =
        error instanceof Error ? error.message : `Failed to save ${componentName}`;
      this.updateMessages();
    } finally {
      this.props.isLoading = false;
      this.updateSubmitButton();
    }
  }

  /**
   * Update submit button text and loading class based on loading state
   */
  protected updateSubmitButton(): void {
    // Subclasses should override to set specific button text
    this.props.loadingClass = this.props.isLoading ? 'loading' : '';
  }

  /**
   * Clear all error and success messages
   */
  protected clearMessages(): void {
    this.props.errorMessage = '';
    this.props.successMessage = '';
    this.updateMessages();
  }

  /**
   * Update message components in the shadow DOM
   */
  protected updateMessages(): void {
    if (!this.shadowRoot) return;

    const errorMsg: unknown = this.shadowRoot.querySelector('#error-message');
    const successMsg: unknown = this.shadowRoot.querySelector('#success-message');

    if (errorMsg) {
      (errorMsg as MessageComponent).updateMessage(this.props.errorMessage, 'error');
    }
    if (successMsg) {
      (successMsg as MessageComponent).updateMessage(this.props.successMessage, 'success');
    }
  }

  /**
   * Create a field updater function for textarea/input fields
   *
   * @param fieldName - Name of the prop field to update
   * @returns Event handler function
   */
  protected createFieldUpdater(fieldName: keyof TProps & string): (event: Event) => void {
    return (event: Event) => {
      const target = event.target as HTMLTextAreaElement | HTMLInputElement;
      // index into props using a typed key
      (this.props as unknown as Record<string, unknown>)[fieldName] = target.value;
      this.clearMessages();
    };
  }

  /**
   * Cancel form and emit cancel event
   */
  cancel(): void {
    this.dispatchEvent(
      new CustomEvent('cancel', { detail: undefined, bubbles: true, composed: true }),
    );
  }

  /**
   * Update header values (checkin-header component)
   * Subclasses can override to provide custom header configuration
   */
  protected updateHeaderValues(headerSelector: string, config: HeaderConfig): void {
    if (!this.shadowRoot) return;

    const header = this.shadowRoot.querySelector(headerSelector) as unknown as {
      updateHeader?: (c: HeaderConfig) => void;
    };
    if (header && header.updateHeader) {
      header.updateHeader(config);
    }
  }

  /**
   * Update form field values from props
   * Generic implementation that queries elements and sets values
   */
  protected updateFormValues(fieldMappings: FieldMapping[]): void {
    if (!this.shadowRoot) return;

    for (const mapping of fieldMappings) {
      const element = this.shadowRoot.querySelector(mapping.selector) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSpanElement
        | null;
      if (element) {
        const value = (this.props as unknown as Record<string, unknown>)[mapping.propName];
        if (element instanceof HTMLSpanElement) {
          element.textContent = value !== undefined ? String(value) : '';
        } else {
          element.value = value !== undefined ? String(value) : '';
        }
      }
    }
  }

  /**
   * Load external data into component props and update form
   */
  protected loadFormData<TData>(data: Partial<TData>, fieldMappings: FieldMapping[]): void {
    // Update props
    Object.assign(this.props, data);

    // Update form inputs
    this.updateFormValues(fieldMappings);
  }

  /**
   * Override connectedCallback to call updateSubmitButton
   */
  connectedCallback(): void {
    super.connectedCallback();
    this.updateSubmitButton();
  }

  /**
   * Override render to call updateFormValues and updateHeaderValues
   * Subclasses should call super.render() and then call their specific update methods
   */
  render(): void {
    super.render();
  }
}

/**
 * Common form props that all form components should have
 */
export interface IFormProps extends IPropTypes {
  errorMessage: string;
  successMessage: string;
  isLoading: boolean;
  submitButtonText: string;
  loadingClass: string;
}

/**
 * Header configuration for checkin-header component
 */
export interface HeaderConfig {
  title: string;
  description?: string;
  showDailyFocus?: boolean;
  coreValue?: string;
  intention?: string;
  metadata?: string;
}

/**
 * Field mapping for updateFormValues
 */
export interface FieldMapping {
  selector: string; // CSS selector for the element
  propName: string; // Name of the prop to map
}
