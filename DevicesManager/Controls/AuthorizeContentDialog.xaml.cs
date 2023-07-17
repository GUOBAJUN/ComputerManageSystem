using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text;
using System.Text.Json;
using System.Threading;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace DevicesManager.Controls;

public sealed partial class AuthorizeContentDialog : ContentDialog
{
    public AuthorizeResult Result { get; private set; }

    public string AuthorizeUrl { get; set; } = string.Empty;
    public string DataType { get; set; }
    public string Username { get; set; }

    public AuthorizeContentDialog()
    {
        this.InitializeComponent();
        this.PrimaryButtonClick += AuthorizeContentDialog_PrimaryButtonClick;
        Result = AuthorizeResult.AuthCancelled;
    }

    private async void AuthorizeContentDialog_PrimaryButtonClick(ContentDialog sender, ContentDialogButtonClickEventArgs args)
    {
        if (string.IsNullOrEmpty(Auth_PasswdBox.Password))
        {
            args.Cancel = true;
            Error_TextBlock.Text = "Password is required.";
        }
        var deferral = args.GetDeferral();
        if (await AuthorizeRequestPost())
        {
            this.Result = AuthorizeResult.Authorized;
        }
        else
        {
            this.Result = AuthorizeResult.Unauthorized;
        }
        deferral.Complete();
    }

    private async Task<bool> AuthorizeRequestPost()
    {
        try
        {
            using StringContent AuthorizeContent = new(
                JsonSerializer.Serialize(new
                {
                    type = DataType,
                    username = Username,
                    password = Auth_PasswdBox.Password.ToString()
                }), Encoding.UTF8, "application/json");
            var response = await (Application.Current as App).httpClient.PostAsync(AuthorizeUrl, AuthorizeContent, new CancellationTokenSource(3000).Token);
            response.EnsureSuccessStatusCode();
            return true;
        }
        catch
        {
            return false;
        }
    }
}

public enum AuthorizeResult
{
    Authorized,
    Unauthorized,
    AuthCancelled
}