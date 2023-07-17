using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using Microsoft.UI.Xaml.Shapes;
using Microsoft.Windows.AppNotifications;
using Microsoft.Windows.AppNotifications.Builder;
using Newtonsoft.Json.Linq;
using Windows.ApplicationModel;
using Windows.ApplicationModel.Activation;
using Windows.ApplicationModel.Background;
using Windows.Foundation;
using Windows.Foundation.Collections;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace DevicesManager;
/// <summary>
/// Provides application-specific behavior to supplement the default Application class.
/// </summary>
public partial class App : Application
{
    /// <summary>
    /// Initializes the singleton application object.  This is the first line of authored code
    /// executed, and as such is the logical equivalent of main() or WinMain().
    /// </summary>
    public App()
    {
        this.InitializeComponent();
        httpClient = new HttpClient(new HttpClientHandler() { UseCookies = true })
        {
            BaseAddress = new Uri("http://VM.local:10086/")
            //BaseAddress = new Uri("http://desktop-i6jagl6.local:10086/")
            //BaseAddress = new Uri("http://127.0.0.1:10086/")
        };
    }

    /// <summary>
    /// Invoked when the application is launched.
    /// </summary>
    /// <param name="args">Details about the launch request and process.</param>
    protected override void OnLaunched(Microsoft.UI.Xaml.LaunchActivatedEventArgs args)
    {
        m_window = new MainWindow();
        m_window.Closed += M_window_Closed;
        m_window.Activate();
        UDP4TrapBackgroundWorker = new();
        UDP4TrapBackgroundWorker.WorkerSupportsCancellation = true;
        UDP4TrapBackgroundWorker.DoWork += UDP4TrapBackgroundWorker_DoWork;
        UDP4TrapBackgroundWorker.WorkerReportsProgress = true;
        UDP4TrapBackgroundWorker.ProgressChanged += UDP4TrapBackgroundWorker_ProgressChanged;
        UDP6TrapBackgroundWorker = new();
        UDP6TrapBackgroundWorker.WorkerSupportsCancellation = true;
        UDP6TrapBackgroundWorker.DoWork += UDP6TrapBackgroundWorker_DoWork;
        UDP6TrapBackgroundWorker.WorkerReportsProgress = true;
        UDP6TrapBackgroundWorker.ProgressChanged += UDP6TrapBackgroundWorker_ProgressChanged;
    }

    private void UDP6TrapBackgroundWorker_ProgressChanged(object sender, ProgressChangedEventArgs e)
    {
        var json = JObject.Parse(e.UserState.ToString());
        var builder = new AppNotificationBuilder().AddArgument("trap_sender", json.Value<string>("Hostname")).AddText("Hostname：" + json.Value<string>("Hostname")).AddText(json.Value<string>("type") + "：" + json["data"].ToString());
        AppNotificationManager.Default.Show(builder.BuildNotification());
    }
    private void UDP4TrapBackgroundWorker_ProgressChanged(object sender, ProgressChangedEventArgs e)
    {
        var json = JObject.Parse(e.UserState.ToString());
        var builder = new AppNotificationBuilder().AddArgument("trap_sender", json.Value<string>("Hostname")).AddText("Hostname：" + json.Value<string>("Hostname")).AddText(json.Value<string>("type") + "：" + json["data"].ToString());
        AppNotificationManager.Default.Show(builder.BuildNotification());
    }

    private void UDP6TrapBackgroundWorker_DoWork(object sender, DoWorkEventArgs e)
    {
        if (sender is not BackgroundWorker worker) { return; }
        try
        {
            UdpClient listener = new UdpClient(10087, AddressFamily.InterNetworkV6);
            IPEndPoint groupEP = new IPEndPoint(IPAddress.IPv6Any, 10087);
            try
            {
                while (!e.Cancel)
                {
                    if (worker.CancellationPending)
                    {
                        e.Cancel = true;
                        break;
                    }
                    var bytes = listener.Receive(ref groupEP);
                    var data = Encoding.UTF8.GetString(bytes, 0, bytes.Length);
                    worker.ReportProgress(1,data);
                }
            }
            catch
            {
            }
        }
        catch
        {
        }
    }

    private async void M_window_Closed(object sender, WindowEventArgs args)
    {
        try
        {
            await httpClient.GetAsync("admin/logout");
        }
        catch { }
    }

    private void UDP4TrapBackgroundWorker_DoWork(object sender, DoWorkEventArgs e)
    {
        if(sender is not BackgroundWorker worker) { return; }
        try
        {
            UdpClient listener = new UdpClient(10087, AddressFamily.InterNetwork);
            IPEndPoint groupEP = new IPEndPoint(IPAddress.Any, 10087);
            try
            {
                while (!e.Cancel)
                {
                    if (worker.CancellationPending)
                    {
                        e.Cancel = true;
                        break;
                    }
                    var bytes = listener.Receive(ref groupEP);
                    var data = Encoding.UTF8.GetString(bytes, 0, bytes.Length);
                    worker.ReportProgress(1, data);
                }
            }
            catch {
            }
        }
        catch {
        }
    }

    private Window m_window;
    public HttpClient httpClient { get; set; }
    public BackgroundWorker UDP4TrapBackgroundWorker { get; set;}
    public BackgroundWorker UDP6TrapBackgroundWorker { get; set; }
    public int MyLevel { get; set; }
}
